/**
 * Whether a visitor gets the 3D cake or the still image. The 3D needs a real graphics chip: drawn on
 * the processor it freezes the page for seconds, so software renderers get the still image instead.
 * The inline script decides before the first paint, so the layout never jumps on the home page.
 */
const SOFTWARE_RENDERER = "swiftshader|llvmpipe|software|basic render";

export function isSoftwareRenderer(name: string): boolean {
  return new RegExp(SOFTWARE_RENDERER, "i").test(name);
}

/** Runs in the document head. Only the home page has a stage, so other pages skip the test. */
export const STAGE_SCRIPT = `try{if(/^\\/(ru\\/?|en\\/?)?$/.test(location.pathname)){
var h=document.documentElement;h.dataset.stageChecked='1';
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
var c=document.createElement('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');
if(g){var i=g.getExtension('WEBGL_debug_renderer_info'),r=i?String(g.getParameter(i.UNMASKED_RENDERER_WEBGL)):'';
if(!new RegExp('${SOFTWARE_RENDERER}','i').test(r))h.classList.add('stage-on');
var l=g.getExtension('WEBGL_lose_context');if(l)l.loseContext();}}}}catch(e){}`;

/** The same decision, for arriving at the home page through a link inside the site. */
export function decideStage(): void {
  const root = document.documentElement;
  if (root.dataset.stageChecked) return;
  root.dataset.stageChecked = "1";
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = document.createElement("canvas").getContext("webgl2");
    if (!context) return;
    const info = context.getExtension("WEBGL_debug_renderer_info");
    if (!isSoftwareRenderer(info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "")) root.classList.add("stage-on");
    context.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // Without a decision the page simply keeps the still image.
  }
}
