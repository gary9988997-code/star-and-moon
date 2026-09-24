/** 羽毛笔素材：笔尖在图内 (3.1%, 98.3%)，素材自带书写倾角 */
export const PEN_DISPLAY_H = 48;
export const PEN_DISPLAY_W = 48; // 源图 1:1
/** 笔尖相对图片左上角的像素偏移 */
export const TIP_OX = PEN_DISPLAY_W * 0.031;
export const TIP_OY = PEN_DISPLAY_H * 0.983;

export default function FeatherPen({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 笔尖锚点需固定尺寸，不用 next/image 布局
    <img
      className={className}
      src="/images/quill-pen.png"
      alt=""
      width={PEN_DISPLAY_W}
      height={PEN_DISPLAY_H}
      draggable={false}
      aria-hidden
    />
  );
}
