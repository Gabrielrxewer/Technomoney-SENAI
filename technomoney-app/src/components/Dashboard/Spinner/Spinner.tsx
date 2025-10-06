import React from "react";
export default function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          height: 24,
          width: 24,
          borderRadius: "999px",
          border: "2px solid currentColor",
          borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
