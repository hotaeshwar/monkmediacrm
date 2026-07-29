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
    const { email, password, requestId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields (email, password)." }, { status: 400 });
    }

    // 3. Find user in Firebase Auth by email
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (authError) {
      console.error(`User search failed for email ${email}:`, authError);
      return NextResponse.json({ error: `Account with email ${email} not found.` }, { status: 404 });
    }

    // 4. Update the user's password in Firebase Authentication
    try {
      await adminAuth.updateUser(userRecord.uid, {
        password: password,
      });
    } catch (updateError) {
      console.error("Password update failed:", updateError);
      return NextResponse.json({ error: updateError.message || "Failed to reset password." }, { status: 400 });
    }

    // 5. Update the status of the request document in Firestore (if requestId provided)
    if (requestId) {
      try {
        await adminDb.collection("passwordResetRequests").doc(requestId).update({
          status: "completed",
          tempPassword: password,
          updatedAt: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error("Failed to update request document:", dbError);
        // We still succeed the reset password, but log the database update warning
      }
    }

    return NextResponse.json({
      success: true,
      email: email,
      password: password,
      message: "Password reset successfully."
    });
  } catch (error) {
    console.error("API Reset Password Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
