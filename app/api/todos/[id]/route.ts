import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const todoId = params.id;

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
    });

    if (!todo) {
      return new NextResponse("Todo not found", { status: 404 });
    }

    if (todo.userId !== userId) {
      return new NextResponse("Forbidden", { status: 401 });
    }

    await prisma.todo.delete({ where: { id: todoId } });

    return NextResponse.json({ message: "Todo deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const {completed} = await req.json();
    const todoId = params.id;

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
    });

    if (!todo) {
      return new NextResponse("Todo not found", { status: 404 });
    }

    if (todo.userId !== userId) {
      return new NextResponse("Forbidden", { status: 401 });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: { completed },
    });

    return NextResponse.json(updatedTodo);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
