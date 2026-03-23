import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mask } = body;

    if (!image || !mask) {
      return NextResponse.json(
        { error: "Missing image or mask data" },
        { status: 400 }
      );
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    // Call Replicate API — using klingcv/remove-anything-v3
    const replicateResponse = await fetch(
      "https://api.replicate.com/v1/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version:
            "3ed0dc3d7a9e525b2de909fdb748c301f12c85d9c4e3c4e82b8e3b6f6e6c5a7b",
          input: {
            image: image,
            mask: mask,
          },
        }),
      }
    );

    if (!replicateResponse.ok) {
      const errText = await replicateResponse.text();
      console.error("Replicate API error:", errText);
      return NextResponse.json(
        { error: "Failed to start inpainting process" },
        { status: 502 }
      );
    }

    const prediction = await replicateResponse.json();
    const predictionUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;

    // Poll for completion (max 60s)
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollResponse = await fetch(predictionUrl, {
        headers: { Authorization: `Token ${apiToken}` },
      });

      const pollData = await pollResponse.json();

      if (pollData.status === "succeeded") {
        const output = pollData.output;
        // Output can be string or array
        const resultUrl = Array.isArray(output) ? output[0] : output;
        return NextResponse.json({ result: resultUrl });
      }

      if (pollData.status === "failed") {
        return NextResponse.json(
          { error: "AI processing failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Processing timeout" },
      { status: 504 }
    );
  } catch (err) {
    console.error("Inpaint route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
