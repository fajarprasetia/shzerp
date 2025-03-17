import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = await Promise.resolve(params.id);
    const data = await request.json();

    // Check if task exists first
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner of the task or an admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const isAdmin = user?.isSystemAdmin || user?.role?.isAdmin;
    const isOwner = existingTask.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to modify this task" },
        { status: 403 }
      );
    }

    // For status-only updates, don't require other fields
    if (Object.keys(data).length === 1 && data.status) {
      if (!["todo", "in-progress", "done"].includes(data.status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }

      const task = await prisma.task.update({
        where: { id },
        data: { status: data.status },
      });

      return NextResponse.json({ 
        success: true,
        data: task 
      });
    }

    // For full updates, validate all fields
    if (!data.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Validate status
    if (data.status && !["todo", "in-progress", "done"].includes(data.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Validate priority
    if (data.priority && !["low", "medium", "high"].includes(data.priority)) {
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

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || "",
        status: data.status,
        priority: data.priority,
        dueDate: dueDate,
        category: data.category || "work",
        tags: data.tags || [],
      },
    });

    return NextResponse.json({ 
      success: true,
      data: task 
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = await Promise.resolve(params.id);

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

    // Check if user is the owner of the task or an admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    const isAdmin = user?.isSystemAdmin || user?.role?.isAdmin;
    const isOwner = existingTask.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to delete this task" },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true,
      message: "Task deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 