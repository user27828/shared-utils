import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CmsTests from "./CmsTests";
import FmTests from "./FmTests";
import CKEditorTests from "./CKEditorTests";
import TurnstileTests from "./TurnstileTests";
import LogTests from "./LogTests";
import OptionsManagerTests from "./OptionsManagerTests";
import ClientComponentTests from "./ClientComponentTests";

vi.mock("@user27828/shared-utils/cms/client", () => {
  return {
    CmsBodyEditor: () => <div>Mock CmsBodyEditor</div>,
    CmsBodyRenderer: () => <div>Mock CmsBodyRenderer</div>,
  };
});

vi.mock("@user27828/shared-utils/fm/client", () => {
  return {
    FmMediaLibrary: () => <div>Mock FmMediaLibrary</div>,
    FmFilePicker: () => <div>Mock FmFilePicker</div>,
  };
});

vi.mock("@user27828/shared-utils/client/wysiwyg", () => {
  return {
    default: () => <div>Mock WysiwygEditor</div>,
  };
});

vi.mock("@user27828/shared-utils/client", () => {
  return {
    BackdropLoader: () => <div>Mock BackdropLoader</div>,
    CheckChip: () => <div>Mock CheckChip</div>,
    CountrySelect: () => <div>Mock CountrySelect</div>,
    Disconnected: () => <div>Mock Disconnected</div>,
    LanguageSelect: () => <div>Mock LanguageSelect</div>,
    FileUploadList: () => <div>Mock FileUploadList</div>,
    ProcessStatusChip: () => <div>Mock ProcessStatusChip</div>,
    SelectChip: () => <div>Mock SelectChip</div>,
    SplitChip: () => <div>Mock SplitChip</div>,
    getCountryByCode: () => ({ name: "United States" }),
    getLanguageByCode: () => ({ name: "English" }),
    pathJoinUrl: (...parts: string[]) => parts.join("/"),
    isDev: () => true,
    exportDataToCsv: () => "a,b\n1,2",
    importCsvData: () => [],
    validateCsvFile: () => ({ valid: true, errors: [] }),
    formatDate: () => "2024-01-01",
    parseDate: () => new Date("2024-01-01"),
    addToDate: (date: Date) => date,
    dateDifference: () => 0,
    isValidDate: () => true,
    getRelativeTime: () => "now",
    getTimezoneInfo: () => ({ timezone: "UTC" }),
    isLeapYear: () => true,
    getDaysInMonth: () => 31,
  };
});

vi.mock("@user27828/shared-utils/utils", () => {
  return {
    turnstile: {},
    log: {},
    Log: class {},
    OptionsManager: class {},
    optionsManager: {},
  };
});

const expectBefore = (first: HTMLElement, second: HTMLElement) => {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
};

describe("Consumer test page layouts", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
  });

  it("keeps CMS controls before results before the live demo", () => {
    render(<CmsTests darkMode={false} />);

    const runAllButton = screen.getByRole("button", {
      name: "Run All CMS Tests",
    });
    const results = screen.getByText("CMS Tests - Test Progress");
    const liveDemo = screen.getByText("Live CMS Demo");

    expectBefore(runAllButton, results);
    expectBefore(results, liveDemo);
  });

  it("keeps FM controls before results before the live demo", () => {
    render(<FmTests />);

    const runAllButton = screen.getByRole("button", {
      name: "Run All FM Tests",
    });
    const results = screen.getByText("FM Tests - Test Progress");
    const liveDemo = screen.getByText("Live FM Demo");

    expectBefore(runAllButton, results);
    expectBefore(results, liveDemo);
  });

  it("keeps WYSIWYG controls before results before the live demo", () => {
    render(<CKEditorTests darkMode={false} />);

    const runAllButton = screen.getByRole("button", {
      name: "Run All CKEditor Tests",
    });
    const results = screen.getByText("CKEditor Tests - Test Progress");
    const liveDemo = screen.getByText("Live CKEditor Demo");

    expectBefore(runAllButton, results);
    expectBefore(results, liveDemo);
  });

  it("keeps Turnstile controls before results before the widget areas", () => {
    render(<TurnstileTests />);

    const runAllButton = screen.getByRole("button", {
      name: "Run All Turnstile Tests",
    });
    const results = screen.getByText("Turnstile Tests - Test Progress");
    const content = screen.getByText("Test Widget Areas");

    expectBefore(runAllButton, results);
    expectBefore(results, content);
  });

  it("keeps log controls before results before the about section", () => {
    render(<LogTests />);

    const runAllButton = screen.getByRole("button", {
      name: "Run All Log Tests",
    });
    const results = screen.getByText("Log Utilities - Test Progress");
    const content = screen.getByText("About Log Utility Tests");

    expectBefore(runAllButton, results);
    expectBefore(results, content);
  });

  it("keeps options manager controls before results before the about section", () => {
    render(<OptionsManagerTests />);

    const runAllButton = screen.getByRole("button", {
      name: "Run All Options Manager Tests",
    });
    const results = screen.getByText("Options Manager - Test Progress");
    const content = screen.getByText("About Options Manager Tests");

    expectBefore(runAllButton, results);
    expectBefore(results, content);
  });

  it("keeps client component controls before results before the live demos", () => {
    render(<ClientComponentTests />);

    const runAllButton = screen.getByRole("button", {
      name: "Run All Client Component Tests",
    });
    const results = screen.getByText("Client Component Tests - Test Progress");
    const content = screen.getByText("Live Component Demos");

    expectBefore(runAllButton, results);
    expectBefore(results, content);
  });
});
