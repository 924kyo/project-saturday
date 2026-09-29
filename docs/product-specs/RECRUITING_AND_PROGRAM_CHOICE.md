# Recruiting and Program Choice

## Purpose

The first major career decision should create a real tradeoff between prestige, development, role opportunity, scheme fit, academics, market/NIL, and personal identity.

## Recruiting profile

A new player has a recruit tier derived from creation/background/starting ability. Use a fictional star-like presentation only if it serves clarity; do not require exact real recruiting-service behavior.

The player receives a manageable shortlist rather than browsing 96 nearly identical offers.

## Offer information

A program offer can show:

- prestige;
- development quality;
- projected starting depth band;
- scheme fit;
- NIL market strength;
- academics;
- championship outlook;
- location/region;
- key program traits;
- what is known vs uncertain.

## Program familiarity

Meta progression can reveal more reliable information for programs experienced in previous careers.

Unknown program details should create discovery, not trick the player with arbitrary hidden penalties.

## Core tradeoff

Examples:

- elite national contender: elite development, brutal depth competition;
- regional contender: good development, realistic rotational path;
- smaller program: immediate snaps, lower national exposure/resources;
- academic elite: different off-field advantages/pressures;
- NIL-rich unstable program: money/brand opportunity but scheme/coach volatility.

## Fall camp

After enrollment, fall camp establishes the first real depth chart and introduces:

- practice grade;
- Coach Trust;
- Body/training;
- position-room competitors;
- initial role projection.

The player should feel the jump from high-school reputation to college competition.

## Implemented vertical-slice flow

The M3 web flow presents the exact five persisted offers as one mobile-first radio decision. All mechanically relevant facts are revealed because program familiarity is not yet implemented. The selected program is a one-time authoritative command; its generated room remains hidden until the save succeeds and exact retry preserves the same room and RNG state.

After commitment, the home flow shows the chosen program and compact depth status while keeping the ordered eight-player WR room collapsed. Program names, descriptions, traits, role/depth labels, save states, and movement explanations ship together in natural `ko-KR` and `en-US` copy.

`recruitingState` remains immutable origin evidence if a later offseason transfer occurs; it is not rewritten to pretend that the destination recruited the athlete initially. Current membership is instead represented by the career's program ID/context and ordered program-history stints. Strict save validation permits origin/current divergence only when an explicit saved transfer decision proves the transition.

## M7 multi-position recruiting foundation

Recruiting ability is position-owned rather than a WR formula with renamed labels. Each alpha position declares exact integer weights across its ten shared and six position attributes; the 16 weights total 1,000 permille. Archetype scheme fit is also limited to the selected position's three archetypes. The staged core projection records ability score, background modifier, bounded recruit score/tier, and scheme fit without consuming RNG.

Program choice still needs the broader 32-program profile and shortlist adapter before non-WR recruitment activates. Until that complete boundary lands, the verified WR shortlist remains authoritative and the new position mechanics are pre-career evidence only.
