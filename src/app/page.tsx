import { env } from "@/lib/env";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{env.NEXT_PUBLIC_APP_NAME}</h1>
      </header>
    </main>
  );
}
