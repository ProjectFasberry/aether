import { useEffect, useRef, useState } from "react";

export const AutoWidthInput = ({ value }: { value: string }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(0);

  useEffect(() => {
    if (!spanRef.current) return;
    setInputWidth(spanRef.current.offsetWidth);
  }, [value]);

  return (
    <>
      <input
        readOnly
        value={value}
        style={{ width: inputWidth }}
        className="bg-transparent border-none outline-none text-neutral-50"
      />
      <span
        ref={spanRef}
        className="invisible absolute whitespace-pre"
        style={{ fontFamily: "monospace" }}
      >
        {value}
      </span>
    </>
  );
}