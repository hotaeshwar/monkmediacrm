import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check if any admin user exists in Firestore
    const usersSnap = await adminDb.collection("users").where("role", "==", "admin").limit(1).get();
    
    return NextResponse.json({
      setupAvailable: usersSnap.empty
    });
  } catch (error) {
    console.error("Setup GET check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    // Enforce that setup is only available if there are no admins
    const usersSnap = await adminDb.collection("users").where("role", "==", "admin").limit(1).get();
    if (!usersSnap.empty) {
      return NextResponse.json({ error: "Forbidden: Setup is locked because an Admin already exists." }, { status: 403 });
    }

    // 1. Create the user in Firebase Authentication using Admin SDK
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Create the user's profile in Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role: "admin",
      phone: "",
      employmentType: "Full-Time",
      paymentModel: "Salary",
      rate: 0,
      assignedClients: [],
      assignedProjects: [],
      status: "active",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: "First Admin account created successfully!"
    });
  } catch (error) {
    console.error("Setup POST submission error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
