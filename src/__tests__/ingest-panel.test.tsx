import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngestPanel } from "@/features/ingest/components/IngestPanel";
import { useStudioStore } from "@/state/store";
import { mockIngestHistory } from "@/state/mock/ingest";
import { seedSessionStatsData } from "@/features/session-stats/seed";

jest.mock("@tauri-apps/api/core", () => ({
  isTauri: () => false,
}));

jest.mock("@tauri-apps/plugin-dialog", () => ({
  open: jest.fn(),
}));

const mockFetch = jest.fn();

defineGlobalHelpers();

function defineGlobalHelpers() {
  if (!global.crypto) {
    Object.defineProperty(global, "crypto", {
      value: {},
    });
  }
  if (typeof global.crypto.randomUUID !== "function") {
    Object.defineProperty(global.crypto, "randomUUID", {
      value: () => "test-uuid",
    });
  }
}

function setStoreDefaults() {
  useStudioStore.setState({
    sessionPrepFolder: "",
    ingestHistory: [...mockIngestHistory],
    lastProToolsSessionCreated: null,
    sessionStatsSessions: seedSessionStatsData.sessions,
    sessionStatsLastIngestedAt: seedSessionStatsData.lastIngestedAt ?? null,
  });
}

describe("IngestPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    // @ts-expect-error - assign mock fetch for tests
    global.fetch = mockFetch;
    setStoreDefaults();
  });

  it("renders the browser folder picker when not running in Tauri", () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/session-prep/upload")) {
        return Promise.resolve({
          json: async () => ({ ok: true, files: [{ name: "Kick.wav", path: "/tmp/Kick.wav" }] }),
        });
      }
      if (url.includes("/api/session-prep/attach")) {
        return Promise.resolve({
          json: async () => ({ ok: true }),
        });
      }
      return Promise.resolve({
        json: async () => ({ ok: false, error: "Unexpected request" }),
      });
    });

    render(<IngestPanel />);

    expect(screen.getByText("Source Folder (Browser)")).toBeInTheDocument();
    expect(screen.getByText("Choose Folder")).toBeInTheDocument();
    expect(screen.queryByText("Browse")).not.toBeInTheDocument();
  });

  it("queues prep from a browser-selected folder", async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/session-prep/upload")) {
        return Promise.resolve({
          json: async () => ({ ok: true, files: [{ name: "Kick.wav", path: "/tmp/Kick.wav" }] }),
        });
      }
      if (url.includes("/api/session-prep/attach")) {
        return Promise.resolve({
          json: async () => ({ ok: true }),
        });
      }
      return Promise.resolve({
        json: async () => ({ ok: false, error: "Unexpected request" }),
      });
    });

    render(<IngestPanel />);

    const sessionSelect = screen.getByLabelText("Existing Session") as HTMLSelectElement;
    await waitFor(() => expect(sessionSelect.options.length).toBeGreaterThan(0));
    await userEvent.selectOptions(sessionSelect, sessionSelect.options[0].value);

    const file = new File(["test"], "Kick.wav", { type: "audio/wav" });
    Object.defineProperty(file, "webkitRelativePath", {
      value: "TestFolder/Kick.wav",
    });

    const input = screen.getByLabelText("Source Folder (Browser)") as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(screen.getByText("1 files from TestFolder")).toBeInTheDocument();

    const prepButton = screen.getByRole("button", { name: "Prep Files" });
    await waitFor(() => expect(prepButton).toBeEnabled());
    await userEvent.click(prepButton);

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/session-prep/upload",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("creates a new session and queues prep", async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/api/session-prep/upload")) {
        return Promise.resolve({
          json: async () => ({ ok: true, files: [{ name: "Snare.wav", path: "/tmp/Snare.wav" }] }),
        });
      }
      if (url.includes("/api/protools/project")) {
        return Promise.resolve({
          json: async () => ({ ok: true }),
        });
      }
      return Promise.resolve({
        json: async () => ({ ok: false, error: "Unexpected request" }),
      });
    });

    render(<IngestPanel />);

    await userEvent.click(screen.getByText("Create New Session"));

    const nameInput = screen.getByLabelText("New Session Name") as HTMLInputElement;
    await userEvent.type(nameInput, "Session Prep Test");

    const file = new File(["test"], "Snare.wav", { type: "audio/wav" });
    Object.defineProperty(file, "webkitRelativePath", {
      value: "WebFolder/Snare.wav",
    });
    const input = screen.getByLabelText("Source Folder (Browser)") as HTMLInputElement;
    await userEvent.upload(input, file);

    await userEvent.click(screen.getByRole("button", { name: "Create & Prep" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(
      await screen.findByText("Session created and imported 1 file(s).")
    ).toBeInTheDocument();

    const { lastProToolsSessionCreated } = useStudioStore.getState();
    expect(lastProToolsSessionCreated?.name).toBe("Session Prep Test");
  });
});
