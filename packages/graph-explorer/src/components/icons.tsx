type IconProps = {
  size?: number | string;
  strokeWidth?: number;
};

const DEFAULT_ICON_PROPS: IconProps = {
  size: 24,
  strokeWidth: 2,
};

export const PointerIcon = (props: IconProps = {}) => {
  const { size, strokeWidth } = { ...DEFAULT_ICON_PROPS, ...props };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon icon-tabler icons-tabler-outline icon-tabler-pointer"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M7.904 17.563a1.2 1.2 0 0 0 2.228 .308l2.09 -3.093l4.907 4.907a1.067 1.067 0 0 0 1.509 0l1.047 -1.047a1.067 1.067 0 0 0 0 -1.509l-4.907 -4.907l3.113 -2.09a1.2 1.2 0 0 0 -.309 -2.228l-13.582 -3.904l3.904 13.563z" />
    </svg>
  );
};

export const RectangularSelectionIcon = (props: IconProps = {}) => {
  const { size, strokeWidth } = { ...DEFAULT_ICON_PROPS, ...props };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon icon-tabler icons-tabler-outline icon-tabler-select-all"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 20v.01" />
      <path d="M16 20v.01" />
      <path d="M8 20v.01" />
      <path d="M4 20v.01" />
      <path d="M4 16v.01" />
      <path d="M4 12v.01" />
      <path d="M4 8v.01" />
      <path d="M4 4v.01" />
      <path d="M8 4v.01" />
      <path d="M12 4v.01" />
      <path d="M16 4v.01" />
      <path d="M20 4v.01" />
      <path d="M20 8v.01" />
      <path d="M20 12v.01" />
      <path d="M20 16v.01" />
      <path d="M20 20v.01" />
    </svg>
  );
};
