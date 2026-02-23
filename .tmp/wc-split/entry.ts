import type SignClientType from '@walletconnect/sign-client';
import type { WalletConnectModal as WalletConnectModalType } from '@walletconnect/modal';
let sc: typeof SignClientType | null = null;
let modalCtor: typeof WalletConnectModalType | null = null;
async function load() {
  const [scm, mm] = await Promise.all([
    import('@walletconnect/sign-client'),
    import('@walletconnect/modal'),
  ]);
  sc = scm.default;
  modalCtor = mm.WalletConnectModal;
  console.log(sc, modalCtor);
}
load();
