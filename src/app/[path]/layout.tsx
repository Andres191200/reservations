import { ThemeToggle } from "../theme-toggle";

/** Frame of the public pages of a Business: only the theme toggle, in a corner. */
export default function PublicLayout({ children }: LayoutProps<"/[path]">) {
  return (
    <>
      <ThemeToggle floating />
      {children}
    </>
  );
}
