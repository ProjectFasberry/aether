//#region login with QR
export type QREventsEvent =
	| "expired"
	| "verified"
	| "connected" // ws only event
	| "declined";

export type QREventsPayload = {
	event: QREventsEvent;
};
export type QRGeneratePayload = { token: string };

export type QRValidateTokenPayload = {
	browser: string;
	geo: {
		city: string;
		country: string;
	};
	timestampz: string;
};

//#endregion

export type GameGeneratePayload = {
	payload: string;
	code: string;
};
