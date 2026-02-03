import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngestPanel } from "@/features/ingest/components/IngestPanel";
import { useStudioStore } from "@/state/store";
import { mockIngestHistory } from "@/state/mock/ingest";

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
    render(<IngestPanel />);

    expect(screen.getByText("Source Folder (Browser)")).toBeInTheDocument();
    expect(screen.getByText("Choose Folder")).toBeInTheDocument();
    expect(screen.queryByText("Browse")).not.toBeInTheDocument();
  });

  it("queues prep from a browser-selected folder", async () => {
    render(<IngestPanel />);

    const file = new File(["test"], "Kick.wav", { type: "audio/wav" });
    Object.defineProperty(file, "webkitRelativePath", {
      value: "TestFolder/Kick.wav",
    });

    const input = screen.getByLabelText("Source Folder (Browser)") as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(screen.getByText("1 files from TestFolder")).toBeInTheDocument();

    const prepButton = screen.getByRole("button", { name: "Prep Files" });
    expect(prepButton).toBeEnabled();

    await userEvent.click(prepButton);

    expect(await screen.findByText("Prep queued with 1 files.")).toBeInTheDocument();

    const { ingestHistory } = useStudioStore.getState();
    expect(ingestHistory[0]?.fileName).toContain(
      "Session Prep — TestFolder (browser) (1 files)"
    );
  });

  it("creates a new session and queues prep", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ ok: true }),
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
    expect(await screen.findByText("Session created and prep queued with 1 files.")).toBeInTheDocument();

    const { lastProToolsSessionCreated } = useStudioStore.getState();
    expect(lastProToolsSessionCreated?.name).toBe("Session Prep Test");
  });
});
