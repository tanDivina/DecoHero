// Limewash walls, olive cabinetry, brass hardware — an interior palette, not a tech one.
export const color = {
  limewash: "#E8EBE6", // app background
  plaster: "#F6F7F4",  // raised surfaces
  ink: "#1C2321",      // text
  stone: "#5A6058",    // secondary text (5.4:1 on limewash)
  olive: "#3E5641",    // primary actions
  oliveDeep: "#2C3E2F",
  brass: "#8A6220",    // selection + credits (4.5:1 on limewash)
  brassWash: "#F3EBDD", // selected chip fill
  line: "#CDD2CB",
  danger: "#9E3A2B",
  disabled: "#D5D9D2", // disabled button fill; stone text on it is 4.5:1
  white: "#FFFFFF",
};

export const font = {
  display: "InstrumentSerif_400Regular",
};

export const radius = { photo: 4, control: 999, chip: 10 };
export const space = (n: number) => n * 4;
