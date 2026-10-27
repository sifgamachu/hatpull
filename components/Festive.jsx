"use client";
import { useEffect } from "react";
// Turns the Christmas look on or off for the whole page (header logo, footer lights, accents).
export default function Festive({ on = true }) {
  useEffect(() => {
    document.documentElement.classList.toggle("xmas-on", !!on);
    window.dispatchEvent(new Event("hp:festive"));
    return () => { document.documentElement.classList.remove("xmas-on"); window.dispatchEvent(new Event("hp:festive")); };
  }, [on]);
  return null;
}
