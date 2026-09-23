import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InteractiveInvestigationObjectProps = {
  id: string;
  label: string;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onClick: () => void;
  className?: string;
  mask?: string;
  sceneImage?: string;
  cycle?: string;
  delay?: string;
  children?: ReactNode;
};

type InvestigationStyle = CSSProperties & {
  "--object-mask"?: string;
  "--idle-cycle"?: string;
  "--idle-delay"?: string;
};

export function InteractiveInvestigationObject({
  id,
  label,
  activeId,
  onActiveChange,
  onClick,
  className,
  mask,
  sceneImage,
  cycle = "4s",
  delay = "0s",
  children,
}: InteractiveInvestigationObjectProps) {
  const isActive = activeId === id;
  const style: InvestigationStyle = {
    "--idle-cycle": cycle,
    "--idle-delay": delay,
    ...(mask ? { "--object-mask": mask } : {}),
  };

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={label}
      data-active={isActive ? "true" : "false"}
      className={cn("investigation-object", sceneImage && "investigation-object--scene", className)}
      style={style}
      onPointerEnter={() => onActiveChange(id)}
      onPointerLeave={() => onActiveChange(null)}
      onFocus={() => onActiveChange(id)}
      onBlur={() => onActiveChange(null)}
      onClick={onClick}
    >
      {sceneImage ? (
        <span className="investigation-object__breath" aria-hidden="true">
          <img src={sceneImage} alt="" draggable={false} />
        </span>
      ) : (
        children
      )}
      <span className="investigation-object__scan" aria-hidden="true" />
    </Button>
  );
}