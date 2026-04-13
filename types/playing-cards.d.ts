declare module "@letele/playing-cards" {
  import type { ComponentType, SVGProps } from "react";

  const deck: Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

  export = deck;
}
