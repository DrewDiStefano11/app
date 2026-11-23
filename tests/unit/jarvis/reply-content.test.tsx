import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { JarvisReplyContent } from "../../../src/components/app/jarvis/reply-content";

test("replies render ordinary Markdown without accepting raw HTML or executable URLs", () => {
  const html = renderToStaticMarkup(
    <JarvisReplyContent
      text={
        "**Meal review**\n\n- Protein **120 g**\n- Calories 1800\n\n1. Review dinner\n2. Log lunch\n\n<script>alert(1)</script>\n[jump](javascript:alert(1))"
      }
    />,
  );
  expect(html).toContain("<strong>Meal review</strong>");
  expect(html).toContain("<ul");
  expect(html).toContain("<ol");
  expect(html).toContain("<li>Protein <strong>120 g</strong></li>");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("href=");
  expect(html).toContain("&lt;script&gt;");
});

test("unfinished Markdown delimiters retain the exact readable content", () => {
  const html = renderToStaticMarkup(<JarvisReplyContent text={"**hello\n__world\n`unfinished"} />);
  expect(html).toContain("**hello");
  expect(html).toContain("__world");
  expect(html).toContain("`unfinished");
});

test("empty list markers and partial model output remain text without trapping rendering", () => {
  const html = renderToStaticMarkup(
    <JarvisReplyContent text={"- \n1. \n\n- Valid item\n- \n\n2. Another item"} />,
  );
  expect(html).toContain("- ");
  expect(html).toContain("1. ");
  expect(html).toContain("Valid item");
  expect(html).toContain("Another item");
});
