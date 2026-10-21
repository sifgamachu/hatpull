import Snow from "./Snow";
import Lights from "./Lights";
// Snowy evergreen banner with string lights, used at the top of Christmas pages.
export default function XBanner({ children, strip = false, style }) {
  return (
    <section className={`xmas xmas-sm ${strip ? "xmas-strip" : ""}`} style={style}>
      <Snow />
      <Lights n={12} />
      <div className="inner1">{children}</div>
    </section>
  );
}
