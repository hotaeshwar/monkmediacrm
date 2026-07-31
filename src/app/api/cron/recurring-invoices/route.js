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
    const activeClientsQuery = await adminDb.collection("clients").where("status", "==", "Active").get();
    
    let invoicesGenerated = 0;
    const batch = adminDb.batch();

    for (const docSnap of activeClientsQuery.docs) {
      const client = docSnap.data();
      const clientId = docSnap.id;
      const financials = client.financials;

      if (!financials || financials.paymentFrequency === "One-Time") continue;

      // Check if billing is due
      const nextPayDate = financials.nextPaymentDate || todayStr;
      
      if (nextPayDate <= todayStr) {
        // Calculate new invoice totals based on active retainer projects
        const projectsSnap = await adminDb.collection("projects")
          .where("clientId", "==", clientId)
          .where("billingType", "==", "Retainer")
          .get();

        const activeRetainerProjects = [];
        for (const pDoc of projectsSnap.docs) {
          const pData = pDoc.data();
          if (pData.status !== "Completed" && pData.status !== "Cancelled") {
            activeRetainerProjects.push({ id: pDoc.id, ...pData });
          }
        }

        if (activeRetainerProjects.length > 0) {
          const taxRate = Number(financials.taxRate) || 13;

          for (const project of activeRetainerProjects) {
            const amount = Number(project.value) || 0;
            if (amount <= 0) continue;

            const tax = Number(((amount * taxRate) / 100).toFixed(2));
            const total = amount + tax;

            // Auto-generate invoice number based on timestamp, client shortName, and project shortName
            const shortName = client.businessName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
            const cleanProjName = project.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
            const invoiceNum = `REC-${shortName}-${cleanProjName}-${Date.now().toString().slice(-4)}`;

            // Setup invoice due date (e.g. 14 days from issue date)
            const due = new Date();
            due.setDate(due.getDate() + 14);
            const dueStr = due.toISOString().split("T")[0];

            // Create new invoice doc reference
            const invoiceRef = adminDb.collection("invoices").doc();
            batch.set(invoiceRef, {
              invoiceNumber: invoiceNum,
              clientId: clientId,
              projectId: project.id,
              invoiceDate: todayStr,
              dueDate: dueStr,
              amount,
              tax,
              total,
              amountPaid: 0,
              balance: total,
              status: "Due",
              paymentMethod: financials.paymentMethod || "Credit Card",
              receiptUrl: "",
              notes: `Auto-generated recurring retainer invoice for project: "${project.name}" by system cron scheduler.`,
              description: `Project Campaign Retainer: ${project.name}`,
              craNumber: "777790411",
              hstNumber: "777790411 RT 0001",
              fromCompanyName: "14689941 Canada Inc.",
              fromBrandName: "Operating as Monk Media",
              fromEmail: "info@monkmedia.ca",
            });

            // Rollover project dates to next month
            const shiftDate = (dateStr) => {
              if (!dateStr) return "";
              const d = new Date(dateStr + "T12:00:00");
              if (isNaN(d.getTime())) return dateStr;
              d.setMonth(d.getMonth() + 1);
              return d.toISOString().split("T")[0];
            };
            const nextStart = shiftDate(project.startDate || todayStr);
            const nextEnd = shiftDate(project.endDate || project.deadline);

            const projectRef = adminDb.collection("projects").doc(project.id);
            batch.update(projectRef, {
              startDate: nextStart,
              endDate: nextEnd,
              deadline: nextEnd
            });

            invoicesGenerated++;
          }

          // Calculate next billing date based on frequency
          const nextDate = new Date();
          if (financials.paymentFrequency === "Weekly") {
            nextDate.setDate(nextDate.getDate() + 7);
          } else if (financials.paymentFrequency === "Bi-Weekly") {
            nextDate.setDate(nextDate.getDate() + 14);
          } else {
            // Default: Monthly
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
          
          const nextDateStr = nextDate.toISOString().split("T")[0];

          // Update client document next/last payment logs
          const clientRef = adminDb.collection("clients").doc(clientId);
          batch.update(clientRef, {
            "financials.nextPaymentDate": nextDateStr,
            "financials.lastPaymentDate": todayStr,
          });
        }
      }
    }

    if (invoicesGenerated > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      invoicesGenerated,
      message: `Checked recurring schedules. Generated ${invoicesGenerated} invoices successfully.`
    });
  } catch (error) {
    console.error("Recurring invoices cron execution failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
