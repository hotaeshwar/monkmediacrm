import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // 1. Verify Authorization Header and check if sender is Admin
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const callerUid = decodedToken.uid;
    const callerDoc = await adminDb.collection("users").doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // 2. Parse request payload
    const body = await request.json();
    const {
      name,
      email,
      password,
      role, // 'manager' or 'team'
      phone,
      employmentType,
      paymentModel,
      rate,
      assignedClients
    } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields (name, email, password, role)." }, { status: 400 });
    }

    // 3. Create Firebase Authentication account
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authError) {
      console.error("Firebase auth creation failed:", authError);
      return NextResponse.json({ error: authError.message || "Failed to create Auth account" }, { status: 400 });
    }

    // 4. Save profile details into Firestore users collection
    const newUserUid = userRecord.uid;
    const parsedRate = Number(rate) || 0;
    const clientList = Array.isArray(assignedClients) ? assignedClients : [];

    const userDocPayload = {
      name,
      email,
      role,
      phone: phone || "",
      status: "active",
      createdAt: new Date().toISOString()
    };

    if (role === "client") {
      userDocPayload.clientId = clientList[0] || "";
    } else {
      userDocPayload.employmentType = employmentType || "Contractor";
      userDocPayload.paymentModel = paymentModel || "Hourly";
      userDocPayload.rate = parsedRate;
      userDocPayload.assignedClients = clientList;
      userDocPayload.assignedProjects = [];
    }

    await adminDb.collection("users").doc(newUserUid).set(userDocPayload);

    return NextResponse.json({
      success: true,
      uid: newUserUid,
      email: email,
      password: password, // return so Admin can share it once
      message: "Team member user created successfully."
    });
  } catch (error) {
    console.error("API Create User Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
