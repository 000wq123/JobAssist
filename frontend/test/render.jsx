import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

/**
 * Plain render helper — no react-query, no data cache.
 * Wrap the component in a MemoryRouter only.
 */
export function renderWithProviders(ui, { route = "/" } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
