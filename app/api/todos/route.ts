import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const ITEMS_PER_PAGE = 10;

export async function GET(req: Request) {
  const { userId } = await auth();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";

  if (!userId) {
    return new NextResponse("User is not Unauthorized", { status: 401 });
  }

  try {
    const todos = await prisma.todo.findMany({
      where: {
        userId: userId,
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      take: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
    });

    const totalItems = await prisma.todo.count({
      where: {
        userId: userId,
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
    });

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return NextResponse.json({ todos, currentPage: page, totalPages });
  } catch (error) {
    console.log("error fetching todos", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("User is not Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      todos: true,
    },
  });

  if (!user) return new NextResponse("User not found", { status: 404 });

  if (!user.isSubscribed && user.todos.length >= 3) {
    return NextResponse.json(
      {
        error:
          "Free users can only create up to 3 todos. Please subscribe for more.",
      },
      { status: 403 }
    );
  }

  const {title} = await req.json();

  const todo = await prisma.todo.create({
    data: {
      title,
      userId,
    },
  });

  return NextResponse.json(todo, { status: 201 })
}
