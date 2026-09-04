export type RazorpayPaymentSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (
    response: RazorpayPaymentSuccess
  ) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    confirm_close?: boolean;
    escape?: boolean;
    backdropclose?: boolean;
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (response: {
      error?: {
        code?: string;
        description?: string;
        reason?: string;
      };
    }) => void
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (
      options: RazorpayOptions
    ) => RazorpayInstance;
  }
}

const CHECKOUT_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

let checkoutScriptPromise:
  | Promise<void>
  | null = null;

export function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (checkoutScriptPromise) {
    return checkoutScriptPromise;
  }

  checkoutScriptPromise =
    new Promise<void>((resolve, reject) => {
      const existingScript =
        document.querySelector<HTMLScriptElement>(
          `script[src="${CHECKOUT_SCRIPT_URL}"]`
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(),
          { once: true }
        );
        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Unable to load Razorpay Checkout. Check browser network access."
              )
            ),
          { once: true }
        );
        return;
      }

      const script =
        document.createElement("script");
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(
          new Error(
            "Unable to load Razorpay Checkout. Check browser network access."
          )
        );

      document.body.appendChild(script);
    });

  return checkoutScriptPromise;
}

export async function openRazorpayCheckout(
  options: Omit<
    RazorpayOptions,
    "handler" | "modal"
  > & {
    modal?: RazorpayOptions["modal"];
  }
) {
  await loadRazorpayCheckout();

  if (!window.Razorpay) {
    throw new Error(
      "Razorpay Checkout is unavailable in this browser."
    );
  }

  const Razorpay = window.Razorpay;

  return new Promise<RazorpayPaymentSuccess>(
    (resolve, reject) => {
      let settled = false;

      const markRejected = (
        error: Error
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      };

      const razorpay =
        new Razorpay({
          ...options,
          handler: (response) => {
            if (settled) {
              return;
            }

            settled = true;
            resolve(response);
          },
          modal: {
            confirm_close: true,
            escape: false,
            backdropclose: false,
            ...options.modal,
            ondismiss: () => {
              options.modal?.ondismiss?.();
              markRejected(
                new Error(
                  "Payment popup was closed before completion."
                )
              );
            },
          },
        });

      razorpay.on(
        "payment.failed",
        (response) => {
          const description =
            response.error?.description ||
            response.error?.reason ||
            response.error?.code ||
            "Razorpay payment failed.";

          markRejected(
            new Error(description)
          );
        }
      );

      razorpay.open();
    }
  );
}
