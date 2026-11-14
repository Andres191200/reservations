import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

function withForwardedFor(value: string) {
  return new Headers({ "x-forwarded-for": value });
}

describe("The client's IP", () => {
  it("is the one the reverse proxy added at the end of X-Forwarded-For", () => {
    expect(clientIp(withForwardedFor("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("ignores the entries a client invents to its left", () => {
    expect(clientIp(withForwardedFor("1.2.3.4, 5.6.7.8,  203.0.113.7 "))).toBe("203.0.113.7");
  });

  it("writes an IPv4 address seen through IPv6 as IPv4", () => {
    expect(clientIp(withForwardedFor("::ffff:203.0.113.7"))).toBe("203.0.113.7");
    expect(clientIp(withForwardedFor("2001:db8::1"))).toBe("2001:db8::1");
  });

  it("is unknown without the header", () => {
    expect(clientIp(new Headers())).toBeUndefined();
    expect(clientIp(withForwardedFor(""))).toBeUndefined();
  });
});
