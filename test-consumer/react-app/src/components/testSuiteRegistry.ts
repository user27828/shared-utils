export type TestSuiteView =
  | "turnstile"
  | "log"
  | "options"
  | "client"
  | "tinymce"
  | "easymde"
  | "mdxeditor"
  | "ckeditor"
  | "cms"
  | "fm"
  | "server";

export type TestView = "index" | TestSuiteView;

export type TestNavItem = {
  view: TestView;
  label: string;
};

export const AUTOMATED_SUITE_VIEWS: TestSuiteView[] = [
  "turnstile",
  "log",
  "options",
  "client",
  "tinymce",
  "easymde",
  "mdxeditor",
  "ckeditor",
  "cms",
  "fm",
  "server",
];

export const TEST_NAV_ITEMS: TestNavItem[] = [
  { view: "index", label: "Test Index" },
  { view: "turnstile", label: "Turnstile Tests" },
  { view: "log", label: "Log Tests" },
  { view: "options", label: "Options Manager" },
  { view: "client", label: "Client Components" },
  { view: "tinymce", label: "TinyMCE Tests" },
  { view: "easymde", label: "EasyMDE Tests" },
  { view: "mdxeditor", label: "MDXEditor Tests" },
  { view: "ckeditor", label: "CKEditor Tests" },
  { view: "cms", label: "CMS Tests" },
  { view: "fm", label: "FM Tests" },
  { view: "server", label: "Server Tests" },
];

const TEST_VIEW_LABELS: Record<TestView, string> = {
  index: "Test Index",
  turnstile: "Turnstile Tests",
  log: "Log Tests",
  options: "Options Manager",
  client: "Client Components",
  tinymce: "TinyMCE Tests",
  easymde: "EasyMDE Tests",
  mdxeditor: "MDXEditor Tests",
  ckeditor: "CKEditor Tests",
  cms: "CMS Tests",
  fm: "FM Tests",
  server: "Server Tests",
};

export const getViewLabel = (view: TestView): string => {
  return TEST_VIEW_LABELS[view];
};
