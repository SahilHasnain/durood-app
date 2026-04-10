import { deleteChannel } from "@/lib/channels";

export async function DELETE(request: Request) {
  try {
    const { youtubeChannelId, deleteNullVideoOnly } = await request.json();
    if (!youtubeChannelId) {
      return new Response(JSON.stringify({ error: "youtubeChannelId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await deleteChannel(
            youtubeChannelId,
            { deleteNullVideoOnly: Boolean(deleteNullVideoOnly) },
            (message) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "log", message })}\n\n`)
              );
            }
          );

          if (!result.success) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: result.error || "Failed to delete channel",
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "complete", result })}\n\n`)
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "Failed to delete channel",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to delete channel",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
