import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tasks = await prisma.task.findMany({
      orderBy: {
        dueDate: "asc",
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Error fetching tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    if (!data.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Validate status
    if (!["todo", "in-progress", "done"].includes(data.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate priority
    if (!["low", "medium", "high"].includes(data.priority)) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      );
    }

    // Validate and parse date
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.dueDate && isNaN(dueDate!.getTime())) {
      return NextResponse.json(
        { error: "Invalid due date" },
        { status: 400 }
      );
    }

    // Validate category
    if (data.category && !["work", "personal", "shopping", "health", "other"].includes(data.category)) {
      return NextResponse.json(
        { error: "Invalid category value" },
        { status: 400 }
      );
    }

    // Validate tags
    if (data.tags && !Array.isArray(data.tags)) {
      return NextResponse.json(
        { error: "Tags must be an array" },
        { status: 400 }
      );
    }

    // Use the current authenticated user
    const userId = session.user.id;

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || "",
        status: data.status,
        priority: data.priority,
        dueDate: dueDate,
        userId: userId,
        category: data.category || "work",
        tags: data.tags || [],
      },
    });

    return NextResponse.json({ 
      success: true,
      data: task 
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!updateData.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Validate status
    if (!["todo", "in-progress", "done"].includes(updateData.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate priority
    if (!["low", "medium", "high"].includes(updateData.priority)) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      );
    }

    // Validate and parse date
    const dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
    if (updateData.dueDate && isNaN(dueDate!.getTime())) {
      return NextResponse.json(
        { error: "Invalid due date" },
        { status: 400 }
      );
    }

    // Validate category
    if (updateData.category && !["work", "personal", "shopping", "health", "other"].includes(updateData.category)) {
      return NextResponse.json(
        { error: "Invalid category value" },
        { status: 400 }
      );
    }

    // Validate tags
    if (updateData.tags && !Array.isArray(updateData.tags)) {
      return NextResponse.json(
        { error: "Tags must be an array" },
        { status: 400 }
      );
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: updateData.title,
        description: updateData.description || "",
        status: updateData.status,
        priority: updateData.priority,
        dueDate: dueDate,
        category: updateData.category,
        tags: updateData.tags || [],
      },
    });

    return NextResponse.json({ 
      success: true,
      data: task 
    });
  } catch (error) {
    console.error("Error updating task:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred while updating the task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }
    await prisma.task.delete({
      where: { id },
    });
    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Error deleting task" },
      { status: 500 }
    );
  }
} 