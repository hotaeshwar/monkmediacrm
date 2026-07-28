import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // 1. Verify Vercel Cron authorization header or CRON_SECRET for security
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron access" }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const batch = adminDb.batch();
    
    let invoicesOverdue = 0;
    let tasksOverdue = 0;

    // 2. Scan Invoices where dueDate < today and status is not Paid
    const invoicesQuery = await adminDb.collection("invoices")
      .where("status", "!=", "Paid")
      .get();

    for (const docSnap of invoicesQuery.docs) {
      const inv = docSnap.data();
      if (inv.dueDate && inv.dueDate < todayStr && inv.status !== "Overdue") {
        // Mark Invoice as Overdue
        batch.update(docSnap.ref, { status: "Overdue" });
        invoicesOverdue++;

        // Mark Client status as Payment Overdue
        if (inv.clientId) {
          const clientRef = adminDb.collection("clients").doc(inv.clientId);
          batch.update(clientRef, { status: "Payment Overdue" });
          
          // Log notifications for Account Manager
          const clientDoc = await clientRef.get();
          if (clientDoc.exists && clientDoc.data().accountManager) {
            const managerUid = clientDoc.data().accountManager;
            const notificationRef = adminDb.collection("notifications").doc();
            batch.set(notificationRef, {
              recipientId: managerUid,
              title: "Payment Overdue Alert",
              message: `Client "${clientDoc.data().businessName}" is overdue on invoice #${inv.invoiceNumber}.`,
              date: todayStr,
              read: false,
            });
          }
        }
      }
    }

    // 3. Scan Tasks where dueDate < today and status is not Completed/Cancelled/Overdue
    const tasksQuery = await adminDb.collection("tasks")
      .get(); // fetch and filter to avoid complex composite inequalities

    for (const docSnap of tasksQuery.docs) {
      const task = docSnap.data();
      if (
        task.dueDate &&
        task.dueDate < todayStr &&
        task.status !== "Completed" &&
        task.status !== "Cancelled" &&
        task.status !== "Overdue"
      ) {
        batch.update(docSnap.ref, { status: "Overdue" });
        tasksOverdue++;
      }
    }

    if (invoicesOverdue > 0 || tasksOverdue > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      invoicesOverdue,
      tasksOverdue,
      message: `Overdue scan completed. Flagged ${invoicesOverdue} invoices and ${tasksOverdue} tasks.`
    });
  } catch (error) {
    console.error("Overdue cron execution failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
