import { beforeEach, describe, expect, it } from "bun:test";
import {
	applyServiceState,
	getServiceState,
	logging,
	updateState,
	type ServiceState,
} from "./index";

const state = (loggingState: Partial<ServiceState["logging"]>) =>
	({ logging: loggingState } as ServiceState);

beforeEach(() => {
	updateState("logging.validators", false);
	updateState("logging.globalError", true);
	updateState("logging.services", true);
	updateState("logging.requests", true);
	updateState("logging.outboundRequests", true);
});

describe("service state", () => {
	it("returns a frozen snapshot instead of the live state", () => {
		const snapshot = getServiceState();

		expect(Object.isFrozen(snapshot)).toBe(true);
		expect(Object.isFrozen(snapshot.logging)).toBe(true);
	});

	it("applies known logging keys and ignores unknown ones", () => {
		applyServiceState(state({ validators: true, services: false, unknown: true } as Partial<ServiceState["logging"]>));

		expect(logging.validators).toBe(true);
		expect(logging.services).toBe(false);
		expect("unknown" in getServiceState().logging).toBe(false);
	});

	it("copies a legacy requests flag to outboundRequests", () => {
		updateState("logging.requests", true);
		updateState("logging.outboundRequests", true);

		applyServiceState(state({ requests: false }));

		expect(logging.requests).toBe(false);
		expect(logging.outboundRequests).toBe(false);
	});

	it("keeps outboundRequests when the new key is present", () => {
		updateState("logging.requests", true);
		updateState("logging.outboundRequests", true);

		applyServiceState(state({ requests: false, outboundRequests: true }));

		expect(logging.requests).toBe(false);
		expect(logging.outboundRequests).toBe(true);
	});


});
