import { STAGE_SCRIPT } from "@/lib/stage-support";

/** Decides before the first paint whether the home page gets the 3D stage or the still image. */
export function StageScript() {
  return <script dangerouslySetInnerHTML={{ __html: STAGE_SCRIPT }} />;
}
