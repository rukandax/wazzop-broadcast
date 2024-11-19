"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface NumberedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  rowColors?: string[];
}

export const NumberedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  NumberedTextareaProps
>(({ className, rowColors = [], ...props }, ref) => {
  const [lineCount, setLineCount] = React.useState(1);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => textareaRef.current!);

  const updateLineCount = () => {
    if (textareaRef.current) {
      const lines = textareaRef.current.value.split("\n");
      setLineCount(lines.length);
    }
  };

  React.useEffect(() => {
    updateLineCount();
  }, []);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;

    if (textarea && lineNumbers) {
      const syncScroll = () => {
        lineNumbers.scrollTop = textarea.scrollTop;
      };

      textarea.addEventListener("scroll", syncScroll);
      return () => textarea.removeEventListener("scroll", syncScroll);
    }
  }, []);

  return (
    <div className="relative">
      <div
        ref={lineNumbersRef}
        className="absolute left-0 top-0 bottom-0 w-10 overflow-hidden bg-gray-100 border border-gray-100 text-gray-400 select-none text-sm py-1 leading-6"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className={cn(
              "px-2 text-right",
              rowColors[i % rowColors.length]
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <Textarea
        {...props}
        ref={textareaRef}
        className={cn("p-0 pl-12 py-1 whitespace-pre leading-6", className)}
        onChange={(e) => {
          updateLineCount();
          props.onChange?.(e);
        }}
      />
    </div>
  );
});

NumberedTextarea.displayName = "NumberedTextarea";
