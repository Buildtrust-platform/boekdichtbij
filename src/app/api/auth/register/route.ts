import { NextResponse } from "next/server";
import { createUser, emailExists } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import { setSessionUserId } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, name, password, phone } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, naam en wachtwoord zijn verplicht" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Wachtwoord moet minimaal 8 tekens zijn" },
        { status: 400 }
      );
    }

    const exists = await emailExists(email);
    if (exists) {
      return NextResponse.json(
        { error: "Dit e-mailadres is al geregistreerd" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, name, passwordHash, phone);

    await setSessionUserId(user.userId);

    return NextResponse.json({
      userId: user.userId,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registratie mislukt" },
      { status: 500 }
    );
  }
}
