/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider } from './context/AppContext';
import { MobileShell } from './components/layout/MobileShell';

export default function App() {
  return (
    <AppProvider>
      <MobileShell />
    </AppProvider>
  );
}
