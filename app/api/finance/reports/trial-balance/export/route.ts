import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTrialBalancePDF } from "../../../../../../app/finance/reports/trial-balance/pdf-generator";
import { generateTrialBalanceExcel } from "../../../../../../app/finance/reports/trial-balance/excel-generator";
import { TrialBalanceData } from "@/types/finance";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get export type and date from query params
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const date = searchParams.get("date");

    if (!type || !date) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    if (type !== "pdf" && type !== "excel") {
      return new NextResponse("Invalid export type", { status: 400 });
    }

    // Get the trial balance data from request body
    const data: TrialBalanceData = await req.json();

    // Generate the appropriate file
    let buffer: ArrayBuffer;
    let contentType: string;
    let filename: string;

    if (type === "pdf") {
      buffer = await generateTrialBalancePDF(data);
      contentType = "application/pdf";
      filename = `trial-balance-${date.split("T")[0]}.pdf`;
    } else {
      buffer = await generateTrialBalanceExcel(data);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `trial-balance-${date.split("T")[0]}.xlsx`;
    }

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[TRIAL_BALANCE_EXPORT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 