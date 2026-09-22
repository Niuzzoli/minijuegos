export type ConnectionsColor = 'yellow' | 'green' | 'blue' | 'purple';

export type ConnectionsCategory = {
  title: string; // the reason for the grouping, hidden until solved
  color: ConnectionsColor; // yellow = easiest -> purple = most obscure/wordplay
  items: string[]; // exactly 4
};
