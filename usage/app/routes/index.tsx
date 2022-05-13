export const loader = async () => {
  return { message: `action function of - /` };
};

export const action = async () => {
  return { message: `action function of - /` };
};

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>This page is /index</h1>
    </div>
  );
}
