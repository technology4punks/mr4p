import { expect, test } from "@playwright/test";

type VoiceTestWindow = Window & {
  neoVoiceTest: {
    deliver: (event: object) => void;
    live: () => boolean;
    pauseCapture: () => void;
    captures: () => number;
    commands: object[];
  };
};

test("shows three consecutive voice turns, mute and recovery even with graphics paused (mock audio/WebRTC)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/realtime-token", (route) =>
    route.fulfill({
      json: {
        value: "test-ephemeral",
        expires_at: Math.floor(Date.now() / 1000) + 60,
      },
    }),
  );
  await page.route("https://api.openai.com/v1/realtime/calls", (route) =>
    route.fulfill({ body: "test-answer" }),
  );
  await page.addInitScript(() => {
    let stream: MediaStream;
    let captures = 0;
    // Headless WebKit has no device audio service. The transport test supplies
    // audio explicitly on every profile; it does not certify real capture.
    class Context {
      state = "running";
      sampleRate = 48000;
      destination = {};
      async resume() {}
      async close() {}
      createBuffer() {
        return {};
      }
      createBufferSource() {
        return { connect() {}, start() {} };
      }
      createAnalyser() {
        return {
          fftSize: 512,
          getFloatTimeDomainData: (values: Float32Array) => values.fill(0),
          disconnect() {},
        };
      }
      createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
      }
    }
    Object.defineProperty(window, "AudioContext", { value: Context });
    const commands: object[] = [];
    const channel = {
      readyState: "open",
      onopen: undefined as (() => void) | undefined,
      onmessage: undefined as ((event: { data: string }) => void) | undefined,
      send: (data: string) => commands.push(JSON.parse(data)),
      close: () => {},
    };
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          captures++;
          const track = {
            muted: false,
            onmute: undefined as (() => void) | undefined,
            enabled: true,
            readyState: "live",
            stop() {
              this.readyState = "ended";
            },
          };
          stream = {
            getAudioTracks: () => [track],
            getTracks: () => [track],
          } as unknown as MediaStream;
          return stream;
        },
      },
    });
    class Peer {
      connectionState = "new";
      onconnectionstatechange?: () => void;
      createDataChannel() {
        return channel;
      }
      addTrack() {
        return {
          async replaceTrack() {},
          async getStats() {
            return new Map();
          },
        };
      }
      async createOffer() {
        return { type: "offer", sdp: "test-offer" };
      }
      async setLocalDescription() {}
      async setRemoteDescription() {
        this.connectionState = "connected";
        this.onconnectionstatechange?.();
        channel.onopen?.();
      }
      close() {}
    }
    Object.defineProperty(window, "RTCPeerConnection", { value: Peer });
    (window as unknown as VoiceTestWindow).neoVoiceTest = {
      deliver: (event) => channel.onmessage?.({ data: JSON.stringify(event) }),
      live: () =>
        !!stream
          ?.getAudioTracks()
          .some((t) => t.enabled && t.readyState === "live"),
      pauseCapture: () => {
        const track = stream.getAudioTracks()[0];
        Object.defineProperty(track, "muted", {
          value: true,
          configurable: true,
        });
        track.onmute?.(new Event("mute"));
      },
      captures: () => captures,
      commands,
    };
  });
  await page.goto("/");
  const status = page.locator(".voice-status strong");
  await expect(status).toHaveCount(0);
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  await expect(
    page.getByRole("button", { name: "Entra nell’osservatorio", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(status).toHaveText("Sto preparando la risposta");
  // Match the welcome response requested after the channel opens.
  await page.evaluate(() => {
    const t = (window as unknown as VoiceTestWindow).neoVoiceTest;
    t.deliver({ type: "response.created", response: { id: "welcome" } });
    t.deliver({
      type: "response.done",
      response: { id: "welcome", status: "completed" },
    });
    window.requestAnimationFrame = () => 0;
  });
  await expect(status).toHaveText("Puoi parlare");
  for (let i = 0; i < 3; i++) {
    await page.evaluate((turn) => {
      (window as unknown as VoiceTestWindow).neoVoiceTest.deliver({
        type: "input_audio_buffer.speech_started",
        item_id: `user${turn}`,
        audio_start_ms: 1000,
      });
    }, i);
    await expect(status).toHaveText("Ti ascolto");
    await page.evaluate((turn) => {
      const t = (window as unknown as VoiceTestWindow).neoVoiceTest;
      t.deliver({
        type: "input_audio_buffer.speech_stopped",
        item_id: `user${turn}`,
        audio_end_ms: 1900,
      });
      t.deliver({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: `user${turn}`,
        transcript:
          turn === 0
            ? "Mi chiamo Luca."
            : turn === 2
              ? "Tram"
              : "Parlami del futuro",
      });
      t.deliver({ type: "response.created", response: { id: `reply${turn}` } });
      t.deliver({
        type: "output_audio_buffer.started",
        response_id: `reply${turn}`,
      });
    }, i);
    await expect(status).toHaveText("NEO risponde");
    await expect(
      page.getByRole("button", { name: "Interrompi NEO", exact: true }),
    ).toBeVisible();
    await page.evaluate((turn) => {
      const t = (window as unknown as VoiceTestWindow).neoVoiceTest;
      t.deliver({
        type: "response.done",
        response: { id: `reply${turn}`, status: "completed" },
      });
      t.deliver({
        type: "output_audio_buffer.stopped",
        response_id: `reply${turn}`,
      });
    }, i);
    await expect(status).toHaveText("Puoi parlare");
    expect(
      await page.evaluate(() =>
        (window as unknown as VoiceTestWindow).neoVoiceTest.live(),
      ),
    ).toBe(true);
  }
  await expect(page.getByLabel("Nome ricordato")).toHaveText("Ciao, Luca.");
  await expect(page.getByLabel("Ultime parole ricevute")).toContainText("Tram");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as VoiceTestWindow).neoVoiceTest.commands.filter(
          (command) => (command as { type: string }).type === "response.create",
        ).length,
    ),
  ).toBe(4);
  // A spoken topic enters directly through the model tool: no entry button,
  // lever selection or confirmation, even while rendering is paused.
  await page.evaluate(() => {
    const t = (window as unknown as VoiceTestWindow).neoVoiceTest;
    t.deliver({
      type: "input_audio_buffer.speech_started",
      item_id: "trees",
      audio_start_ms: 0,
    });
    t.deliver({
      type: "input_audio_buffer.speech_stopped",
      item_id: "trees",
      audio_end_ms: 1200,
    });
    t.deliver({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "trees",
      transcript: "Mostrami gli alberi",
    });
    t.deliver({ type: "response.created", response: { id: "show-trees" } });
    t.deliver({
      type: "response.function_call_arguments.done",
      call_id: "trees-tool",
      name: "show_intervention",
      arguments: JSON.stringify({ optionId: "GREEN_TREES" }),
    });
    t.deliver({
      type: "response.done",
      response: { id: "show-trees", status: "completed" },
    });
  });
  await expect(
    page.getByRole("button", { name: "Entra nell’osservatorio", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Nome ricordato")).toHaveText("Ciao, Luca.");
  expect(
    await page.evaluate(() =>
      (window as unknown as VoiceTestWindow).neoVoiceTest.live(),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      (window as unknown as VoiceTestWindow).neoVoiceTest.captures(),
    ),
  ).toBe(1);
  await page.evaluate(() => {
    const t = (window as unknown as VoiceTestWindow).neoVoiceTest;
    t.deliver({ type: "response.created", response: { id: "visit" } });
    t.deliver({
      type: "response.done",
      response: { id: "visit", status: "completed" },
    });
  });
  // A live track can be suspended by the device: explicit recovery must
  // reacquire capture rather than merely flip the enabled flag.
  await page.evaluate(() =>
    (window as unknown as VoiceTestWindow).neoVoiceTest.pauseCapture(),
  );
  await expect(status).toHaveText("Microfono in pausa");
  await page
    .getByRole("button", { name: "Riprendi ascolto", exact: true })
    .click();
  await expect(status).toHaveText("Puoi parlare");
  expect(
    await page.evaluate(() =>
      (window as unknown as VoiceTestWindow).neoVoiceTest.captures(),
    ),
  ).toBe(2);
  await page
    .getByRole("button", { name: "Disattiva microfono", exact: true })
    .click();
  await expect(status).toHaveText("Microfono spento");
  expect(
    await page.evaluate(() =>
      (window as unknown as VoiceTestWindow).neoVoiceTest.live(),
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Riprendi ascolto", exact: true })
    .click();
  await expect(status).toHaveText("Puoi parlare");
  expect(
    await page.evaluate(() =>
      (window as unknown as VoiceTestWindow).neoVoiceTest.live(),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Termina conversazione" }).click();
  await expect(status).toHaveText("Voce spenta");
  expect(
    await page.evaluate(() =>
      (window as unknown as VoiceTestWindow).neoVoiceTest.live(),
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("catalog remains available during transformations and queues the next topic without confirmation", async ({
  page,
}) => {
  // Portal + entry + two seven-second transformations, plus software-rendered
  // interactions. Keep each phase bounded below while allowing the whole visit.
  test.setTimeout(45000);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new Error("No device");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "INIZIA ESPERIENZA" }).click();
  await page
    .getByRole("button", { name: "Entra nell’osservatorio", exact: true })
    .click({ timeout: 15000 });
  // Android suspends canvas RAF outside its viewport. Both queued transitions
  // and catalog controls must keep working independently of those frames.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  // The catalog is already available in the critical city: the begin button is optional.
  await page
    .getByRole("button", { name: "Mobilità urbana", exact: true })
    .click({ timeout: 10000 });
  await page
    .locator('[aria-label="Tre interventi disponibili"] button')
    .filter({ has: page.getByText("Tram elettrici", { exact: true }) })
    .click();
  await page.getByRole("button", { name: "Verde urbano", exact: true }).click();
  await page
    .locator('[aria-label="Tre interventi disponibili"] button')
    .filter({ has: page.getByText("Grande parco", { exact: true }) })
    .click();
  await expect(page.locator(".story-message")).toContainText(
    "lo mostro appena",
  );
  await expect(page.locator(".story-message")).toContainText(
    "Grande parco: la città si trasforma",
    { timeout: 11000 },
  );
  await expect(
    page.getByRole("button", { name: "Continua", exact: true }),
  ).toBeVisible({ timeout: 11000 });
});
