import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET handler to retrieve tax settings
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch tax settings from the database
    const taxSettings = await prisma.taxSetting.findMany({
      orderBy: {
        taxType: "asc",
      },
    });

    // Group settings by tax type
    const groupedSettings = taxSettings.reduce((acc, setting) => {
      const { taxType, key, value } = setting;
      
      if (!acc[taxType]) {
        acc[taxType] = {};
      }
      
      // Parse JSON values if needed
      try {
        acc[taxType][key] = JSON.parse(value);
      } catch (e) {
        acc[taxType][key] = value;
      }
      
      return acc;
    }, {} as Record<string, Record<string, any>>);

    return NextResponse.json(groupedSettings);
  } catch (error) {
    console.error("[TAX_SETTINGS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// POST handler to update tax settings
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { taxType, settings } = body;

    if (!taxType || !settings) {
      return new NextResponse("Tax type and settings are required", { status: 400 });
    }

    // Process each setting
    const settingsArray = Object.entries(settings).map(([key, value]) => ({
      taxType,
      key,
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));

    // Use transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Delete existing settings for this tax type
      await tx.taxSetting.deleteMany({
        where: {
          taxType,
        },
      });

      // Create new settings
      for (const setting of settingsArray) {
        await tx.taxSetting.create({
          data: setting,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TAX_SETTINGS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PATCH handler to update specific tax settings
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { taxType, key, value } = body;

    if (!taxType || !key) {
      return new NextResponse("Tax type and key are required", { status: 400 });
    }

    // Convert value to string if it's an object
    const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);

    // Upsert the setting (update if exists, create if not)
    await prisma.taxSetting.upsert({
      where: {
        taxType_key: {
          taxType,
          key,
        },
      },
      update: {
        value: stringValue,
      },
      create: {
        taxType,
        key,
        value: stringValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TAX_SETTINGS_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 