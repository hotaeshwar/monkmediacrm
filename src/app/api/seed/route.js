import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function clearCollection(colName, keepAdmin = false) {
  const snap = await adminDb.collection(colName).get();
  const batch = adminDb.batch();
  let count = 0;
  
  snap.forEach((doc) => {
    if (keepAdmin && colName === "users") {
      const data = doc.data();
      if (data.email === "sharmaatul@gmail.com") {
        return; // Keep admin profile
      }
    }
    batch.delete(doc.ref);
    count++;
  });
  
  if (count > 0) {
    await batch.commit();
  }
  console.log(`Cleared ${count} docs from collection: ${colName}`);
}

export async function GET() {
  try {
    // 1. Clear database collections
    await clearCollection("clients");
    await clearCollection("projects");
    await clearCollection("tasks");
    await clearCollection("invoices");
    await clearCollection("expenses");
    await clearCollection("payments");
    await clearCollection("leads");
    await clearCollection("users", true); // Keep the admin profile!

    // 2. Seed Fake Team Members (Firestore users collection)
    const managerId = "fake-mgr-uid-janesmith";
    const teamId = "fake-team-uid-johndoe";

    await adminDb.collection("users").doc(managerId).set({
      name: "Jane Smith",
      email: "janesmith@gmail.com",
      role: "manager",
      phone: "+1 555-0199",
      employmentType: "Full-Time",
      paymentModel: "Salary",
      rate: 7500,
      assignedClients: [],
      assignedProjects: [],
      status: "active",
      createdAt: new Date().toISOString()
    });

    await adminDb.collection("users").doc(teamId).set({
      name: "John Doe",
      email: "johndoe@gmail.com",
      role: "team",
      phone: "+1 555-0144",
      employmentType: "Full-Time",
      paymentModel: "Salary",
      rate: 5500,
      assignedClients: [],
      assignedProjects: [],
      status: "active",
      createdAt: new Date().toISOString()
    });

    // 3. Seed Fake Clients
    const client1Ref = adminDb.collection("clients").doc();
    const client2Ref = adminDb.collection("clients").doc();
    const client3Ref = adminDb.collection("clients").doc();

    const client1Id = client1Ref.id;
    const client2Id = client2Ref.id;
    const client3Id = client3Ref.id;

    await client1Ref.set({
      businessName: "Metric Air Limited",
      onboardingContactName: "Tejinder Singh",
      email: "metricairlimited.ca@gmail.com",
      phone: "+1 416-555-0192",
      address: "100 Bay St, Toronto, ON, Canada",
      onboardingStatus: "active",
      financials: {
        taxRate: 13,
        paymentMethod: "Bank Transfer",
        totalPaid: 17035.88,
        lastPaymentDate: "2026-07-20"
      },
      accountManager: managerId,
      createdAt: new Date().toISOString()
    });

    await client2Ref.set({
      businessName: "Acme Corporation",
      onboardingContactName: "Jane Miller",
      email: "billing@acme.com",
      phone: "+1 212-555-0133",
      address: "500 5th Ave, New York, NY, USA",
      onboardingStatus: "active",
      financials: {
        taxRate: 13,
        paymentMethod: "Credit Card",
        totalPaid: 0,
        lastPaymentDate: ""
      },
      accountManager: managerId,
      createdAt: new Date().toISOString()
    });

    await client3Ref.set({
      businessName: "Global Brands Group",
      onboardingContactName: "Robert Down",
      email: "invoice@globalbrands.com",
      phone: "+1 310-555-0147",
      address: "9000 Sunset Blvd, West Hollywood, CA, USA",
      onboardingStatus: "active",
      financials: {
        taxRate: 13,
        paymentMethod: "Stripe",
        totalPaid: 0,
        lastPaymentDate: ""
      },
      accountManager: managerId,
      createdAt: new Date().toISOString()
    });

    // 4. Seed Fake Projects
    const proj1Ref = adminDb.collection("projects").doc();
    const proj2Ref = adminDb.collection("projects").doc();
    const proj3Ref = adminDb.collection("projects").doc();

    const proj1Id = proj1Ref.id;
    const proj2Id = proj2Ref.id;
    const proj3Id = proj3Ref.id;

    await proj1Ref.set({
      name: "Software and App Development",
      clientId: client1Id,
      status: "completed",
      description: "Custom agency business analytics application integration.",
      budget: 15076,
      startDate: "2026-06-01",
      endDate: "2026-07-20",
      assignedTeam: [teamId],
      createdAt: new Date().toISOString()
    });

    await proj2Ref.set({
      name: "Summer Campaign Video",
      clientId: client2Id,
      status: "in-progress",
      description: "Promotional cinematic reels and video campaigns.",
      budget: 5000,
      startDate: "2026-07-01",
      endDate: "2026-08-15",
      assignedTeam: [teamId],
      createdAt: new Date().toISOString()
    });

    await proj3Ref.set({
      name: "Brand Identity Rebrand",
      clientId: client3Id,
      status: "in-progress",
      description: "Logo updates, branding assets, guidelines and visual templates.",
      budget: 8500,
      startDate: "2026-07-10",
      endDate: "2026-08-30",
      assignedTeam: [teamId],
      createdAt: new Date().toISOString()
    });

    // Update clients with project references
    await client1Ref.update({ assignedProjects: [proj1Id] });
    await client2Ref.update({ assignedProjects: [proj2Id] });
    await client3Ref.update({ assignedProjects: [proj3Id] });

    // 5. Seed Fake Invoices
    const inv1Ref = adminDb.collection("invoices").doc();
    const inv2Ref = adminDb.collection("invoices").doc();

    const inv1Id = inv1Ref.id;
    const inv2Id = inv2Ref.id;

    await inv1Ref.set({
      invoiceNumber: "MM-2026-07-20-001",
      clientId: client1Id,
      projectId: proj1Id,
      invoiceDate: "2026-07-20",
      dueDate: "2026-07-20",
      amount: 15076,
      tax: 1959.88,
      total: 17035.88,
      amountPaid: 17035.88,
      balance: 0,
      status: "Paid",
      paymentMethod: "Bank Transfer",
      receiptUrl: "",
      notes: "Auto-seeded setup invoice."
    });

    await inv2Ref.set({
      invoiceNumber: "MM-2026-07-25-001",
      clientId: client2Id,
      projectId: proj2Id,
      invoiceDate: "2026-07-25",
      dueDate: "2026-08-10",
      amount: 2500,
      tax: 325,
      total: 2825,
      amountPaid: 0,
      balance: 2825,
      status: "Sent",
      paymentMethod: "Credit Card",
      receiptUrl: "",
      notes: "Half-milestone upfront deposit invoice."
    });

    // 6. Seed Fake Payments
    await adminDb.collection("payments").add({
      invoiceId: inv1Id,
      clientId: client1Id,
      amount: 17035.88,
      dateReceived: "2026-07-20",
      method: "Bank Transfer",
      notes: "Full payment received via corporate bank transfer."
    });

    // 7. Seed Fake Expenditures
    await adminDb.collection("expenses").add({
      category: "Marketing",
      amount: 450,
      date: "2026-07-15",
      clientId: client2Id,
      projectId: proj2Id,
      notes: "Cinematic trailer ad campaign spend."
    });

    await adminDb.collection("expenses").add({
      category: "Software",
      amount: 120,
      date: "2026-07-10",
      clientId: "",
      projectId: "",
      notes: "Adobe Creative Cloud subscription licenses."
    });

    // 8. Seed Fake Tasks
    await adminDb.collection("tasks").add({
      title: "Design Landing Page Figma",
      description: "Create branding UI layout drafts for review.",
      projectId: proj3Id,
      status: "Completed",
      dueDate: "2026-07-18",
      assignedTo: teamId,
      createdAt: new Date().toISOString()
    });

    await adminDb.collection("tasks").add({
      title: "Development coding components",
      description: "Write responsive NextJS template wrappers.",
      projectId: proj1Id,
      status: "Completed",
      dueDate: "2026-07-15",
      assignedTo: teamId,
      createdAt: new Date().toISOString()
    });

    // 9. Seed Fake Leads
    await adminDb.collection("leads").add({
      name: "Apex Realty",
      contactName: "Sarah Connor",
      email: "sarah@apex.com",
      phone: "+1 555-0188",
      value: 12000,
      status: "proposal",
      notes: "Requires standard video production and rebrand package.",
      createdAt: new Date().toISOString()
    });

    await adminDb.collection("leads").add({
      name: "Zenith Cafe",
      contactName: "Tom Baker",
      email: "tom@zenith.com",
      phone: "+1 555-0112",
      value: 3500,
      status: "contacted",
      notes: "Wants promotional summer reels.",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: "Database cleared and populated with fresh CRM seed data successfully!"
    });
  } catch (error) {
    console.error("Database seeding failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
