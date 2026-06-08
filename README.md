<h1 align="center">Zendvo</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.x-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TS 5" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-teal?style=for-the-badge&logo=drizzle" alt="Drizzle" />
  <img src="https://img.shields.io/badge/Stellar-Soroban-black?style=for-the-badge&logo=stellar" alt="Stellar" />
</p>

**Zendvo** is an expense, savings, and gifting platform that transforms digital money transfers into memorable experiences. It enables users to send cash gifts that remain completely hidden and locked until a predetermined date and time, save toward a specific item or goal, and track daily expenses accurately.

## Features

- **Time-Locked Gifting**: Funds are locked in Soroban smart contracts and only released after a specified date and time, enforced entirely on-chain.
- **Stablecoin Preservation**: Uses USDC on Stellar to keep gift value stable from creation to reveal, eliminating volatility risk.
- **Yield on Savings**: Idle savings earn yield through Stellar's AMM liquidity pools or Blend Protocol lending, so balances grow while waiting.
- **Bank Integration**: Seamless on/off-ramps connecting stablecoin liquidity to local bank accounts, with Paystack powering Nigerian NGN payouts.
- **Surprise Experience**: UI/UX built around anticipation, revealing gifts only at the exact unlock moment.
- **Low-Cost Global Transfers**: Stellar's 3–5 second finality and near-zero fees make cross-border gifting practical at any amount.
- **Expense Tracking**: Accurate daily expense calculation with categorization and spending summaries.

## Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Smart Contracts**: Stellar Soroban (Rust)
- **Styling**: Tailwind CSS 4
- **Blockchain**: Stellar SDK, Soroban SDK
- **Payments**: Stripe, Paystack

## Stellar Integration

Zendvo uses the Stellar ecosystem for its core financial primitives:

| Feature | Stellar Primitive |
|---|---|
| Time-locked gifts | Soroban smart contracts with `time_lock` logic |
| Stable transfers | USDC (Circle) on Stellar |
| Savings yield | Stellar AMM pools / Blend Protocol |
| Low-fee settlement | Stellar Consensus Protocol (SCP) |
| On/off-ramp | Anchor-compatible deposit/withdrawal |

> Stellar does not have native proof-of-stake staking. Yield on savings is earned through liquidity provision in Stellar's built-in AMM or via the Blend Protocol lending market — both non-custodial and on-chain.

## Quick Start

1. **Clone and prepare**:
   ```bash
   git clone https://github.com/codeze-us/zendvo.git
   cd zendvo
   cp .env.example .env
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database setup**:
   ```bash
   npm run db:push
   ```

4. **Run in development**:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/                  # Next.js App Router (pages & API routes)
├── server/               # Backend business logic & services
├── components/           # Modular UI component library
├── lib/                  # Blockchain & payment integrations
├── types/                # Global TypeScript definitions
└── styles/               # Design system & styling
```

## Documentation

- [Documentation Index](./docs/README.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Project Vision](./docs/context/project-overview.md)
- [Smart Contract Logic](./docs/blockchain/contracts.md)

## Use Cases

### Surprise Birthdays
Send a cash gift weeks in advance that only unlocks at exactly 12:00 AM on the recipient's birthday.

### Graduation Gifts
Lock funds until a graduation date, ensuring the gift lands at the right moment.

### Cross-Border Gifting
Send USDC from anywhere in the world to Nigerian recipients with local bank payout and time-locked reveal logic.

### Goal Savings
Set a savings target for an item or date, earn yield while saving, and withdraw when ready.

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](./LICENSE).

## Support

- **Issues**: [GitHub Issues](https://github.com/codeze-us/zendvo/issues)
- **Website**: [www.zendvo.com](https://www.zendvo.com)

## Maintainers

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/Emrys02.png" alt="Emrys02" width="150" />
      <br /><br />
      <strong>Emrys02</strong>
      <br /><br />
      <a href="https://github.com/Emrys02" target="_blank">GitHub</a>
    </td>
    <td align="center">
      <img src="https://github.com/codeze-us.png" alt="codeZe-us" width="150" />
      <br /><br />
      <strong>codeZe-us</strong>
      <br /><br />
      <a href="https://github.com/codeze-us" target="_blank">GitHub</a>
    </td>
  </tr>
</table>

<p align="center">
  <i>Decentralizing the art of surprise on Stellar</i>
</p>

---
