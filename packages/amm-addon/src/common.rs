use primitive_types::{U256, U512};
use serde::{Deserialize, Serialize};

pub const ONE_IN_HUNDREDTH_PIPS: u32 = 1_000_000;
pub const MAX_LP_FEE: u32 = ONE_IN_HUNDREDTH_PIPS / 2;

/// Represents an amount of an asset, in its smallest unit i.e. Ethereum has 10^-18 precision, and
/// therefore an `Amount` with the literal value of `1` would represent 10^-18 Ethereum.
pub type Amount = U256;
/// The `log1.0001(price)` rounded to the nearest integer. Note [Price] is always
/// in units of asset One.
pub type Tick = i32;
/// The square root of the price, represented as a fixed point integer with 96 fractional bits and
/// 64 integer bits (The higher bits past 96+64 th aren't used). [SqrtPriceQ64F96] is always in sqrt
/// units of asset one.
pub type SqrtPriceQ64F96 = U256;
/// The number of fractional bits used by `SqrtPriceQ64F96`.
pub const SQRT_PRICE_FRACTIONAL_BITS: u32 = 96;

pub type LiquidityProvider = i32;

#[derive(Debug, PartialEq, Eq, Hash)]
#[napi]
pub enum Side {
    Buy,
    Sell,
}

impl Side {
    pub fn to_sold_pair(&self) -> Pairs {
        match self {
            Side::Buy => Pairs::Quote,
            Side::Sell => Pairs::Base,
        }
    }
}
impl core::ops::Not for Side {
    type Output = Self;

    fn not(self) -> Self::Output {
        match self {
            Side::Sell => Side::Buy,
            Side::Buy => Side::Sell,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Pairs {
    Base,
    Quote,
}

impl core::ops::Not for Pairs {
    type Output = Self;

    fn not(self) -> Self::Output {
        match self {
            Pairs::Base => Pairs::Quote,
            Pairs::Quote => Pairs::Base,
        }
    }
}

impl Pairs {
    pub fn sell_order(&self) -> Side {
        match self {
            Pairs::Base => Side::Sell,
            Pairs::Quote => Side::Buy,
        }
    }
}

#[derive(Copy, Clone, Default, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PoolPairsMap<T> {
    pub base: T,
    pub quote: T,
}

impl<T> PoolPairsMap<T> {
    pub fn from_array(array: [T; 2]) -> Self {
        let [base, quote] = array;
        Self { base, quote }
    }

    pub fn map_with_pair<R, F: FnMut(Pairs, T) -> R>(self, mut f: F) -> PoolPairsMap<R> {
        PoolPairsMap {
            base: f(Pairs::Base, self.base),
            quote: f(Pairs::Quote, self.quote),
        }
    }
}
impl<T> IntoIterator for PoolPairsMap<T> {
    type Item = (Pairs, T);

    type IntoIter = core::array::IntoIter<(Pairs, T), 2>;

    fn into_iter(self) -> Self::IntoIter {
        [(Pairs::Base, self.base), (Pairs::Quote, self.quote)].into_iter()
    }
}
impl<T> core::ops::Index<Pairs> for PoolPairsMap<T> {
    type Output = T;
    fn index(&self, side: Pairs) -> &T {
        match side {
            Pairs::Base => &self.base,
            Pairs::Quote => &self.quote,
        }
    }
}
impl<T> core::ops::IndexMut<Pairs> for PoolPairsMap<T> {
    fn index_mut(&mut self, side: Pairs) -> &mut T {
        match side {
            Pairs::Base => &mut self.base,
            Pairs::Quote => &mut self.quote,
        }
    }
}
impl<T: core::ops::Add<R>, R> core::ops::Add<PoolPairsMap<R>> for PoolPairsMap<T> {
    type Output = PoolPairsMap<<T as core::ops::Add<R>>::Output>;
    fn add(self, rhs: PoolPairsMap<R>) -> Self::Output {
        PoolPairsMap {
            base: self.base + rhs.base,
            quote: self.quote + rhs.quote,
        }
    }
}

pub fn mul_div_floor<C: Into<U512>>(a: U256, b: U256, c: C) -> U256 {
    let c: U512 = c.into();
    (U256::full_mul(a, b) / c).try_into().unwrap()
}

pub fn mul_div_ceil<C: Into<U512>>(a: U256, b: U256, c: C) -> U256 {
    mul_div(a, b, c).1
}

pub fn mul_div<C: Into<U512>>(a: U256, b: U256, c: C) -> (U256, U256) {
    let c: U512 = c.into();

    let (d, m) = U512::div_mod(U256::full_mul(a, b), c);

    (
        d.try_into().unwrap(),
        if m > U512::from(0) {
            // cannot overflow as for m > 0, c must be > 1, and as (a*b) < U512::MAX, therefore
            // a*b/c < U512::MAX
            d + 1
        } else {
            d
        }
        .try_into()
        .unwrap(),
    )
}

/// A marker type to represent a swap that buys asset Quote, and sells asset Base
pub struct BaseToQuote {}
/// A marker type to represent a swap that buys asset Base, and sells asset Quote
pub struct QuoteToBase {}

pub trait SwapDirection {
    /// The asset this type of swap sells, i.e. the asset the swapper provides
    const INPUT_SIDE: Pairs;

    /// The worst price in this swap direction
    const WORST_SQRT_PRICE: SqrtPriceQ64F96;

    /// Determines if a given sqrt_price is more than another for this direction of swap.
    fn sqrt_price_op_more_than(
        sqrt_price: SqrtPriceQ64F96,
        sqrt_price_other: SqrtPriceQ64F96,
    ) -> bool;
}
impl SwapDirection for BaseToQuote {
    const INPUT_SIDE: Pairs = Pairs::Base;

    const WORST_SQRT_PRICE: SqrtPriceQ64F96 = MIN_SQRT_PRICE;

    fn sqrt_price_op_more_than(
        sqrt_price: SqrtPriceQ64F96,
        sqrt_price_other: SqrtPriceQ64F96,
    ) -> bool {
        sqrt_price < sqrt_price_other
    }
}

impl SwapDirection for QuoteToBase {
    const INPUT_SIDE: Pairs = Pairs::Quote;

    const WORST_SQRT_PRICE: SqrtPriceQ64F96 = MAX_SQRT_PRICE;

    fn sqrt_price_op_more_than(
        sqrt_price: SqrtPriceQ64F96,
        sqrt_price_other: SqrtPriceQ64F96,
    ) -> bool {
        sqrt_price > sqrt_price_other
    }
}

// TODO: Consider increasing Price to U512 or switch to a f64 (f64 would only be for the external
// price representation), as at low ticks the precision in the price is VERY LOW, but this does not
// cause any problems for the AMM code in terms of correctness
/// This is the ratio of equivalently valued amounts of asset One and asset Zero. The price is
/// always measured in amount of asset One per unit of asset Zero. Therefore as asset zero becomes
/// more valuable relative to asset one the price's literal value goes up, and vice versa. This
/// ratio is represented as a fixed point number with `PRICE_FRACTIONAL_BITS` fractional bits.
pub type Price = U256;
pub const PRICE_FRACTIONAL_BITS: u32 = 128;

/// Converts from a [SqrtPriceQ64F96] to a [Price].
///
/// Will panic for `sqrt_price`'s outside `MIN_SQRT_PRICE..=MAX_SQRT_PRICE`
pub fn sqrt_price_to_price(sqrt_price: SqrtPriceQ64F96) -> Price {
    assert!(is_sqrt_price_valid(sqrt_price));

    // Note the value here cannot ever be zero as MIN_SQRT_PRICE has its 33th bit set, so sqrt_price
    // will always include a bit pass the 64th bit that is set, so when we shift down below that set
    // bit will not be removed.
    mul_div_floor(
        sqrt_price,
        sqrt_price,
        SqrtPriceQ64F96::one() << (2 * SQRT_PRICE_FRACTIONAL_BITS - PRICE_FRACTIONAL_BITS),
    )
}

/// The minimum tick that may be passed to `sqrt_price_at_tick` computed from log base 1.0001 of
/// 2**-128
pub const MIN_TICK: Tick = -887272;
/// The maximum tick that may be passed to `sqrt_price_at_tick` computed from log base 1.0001 of
/// 2**128
pub const MAX_TICK: Tick = -MIN_TICK;
/// The minimum value that can be returned from `sqrt_price_at_tick`. Equivalent to
/// `sqrt_price_at_tick(MIN_TICK)`
pub const MIN_SQRT_PRICE: SqrtPriceQ64F96 = U256([0x1000276a3u64, 0x0, 0x0, 0x0]);
/// The maximum value that can be returned from `sqrt_price_at_tick`. Equivalent to
/// `sqrt_price_at_tick(MAX_TICK)`.
pub const MAX_SQRT_PRICE: SqrtPriceQ64F96 = U256([
    0x5d951d5263988d26u64,
    0xefd1fc6a50648849u64,
    0xfffd8963u64,
    0x0u64,
]);

pub fn is_sqrt_price_valid(sqrt_price: SqrtPriceQ64F96) -> bool {
    (MIN_SQRT_PRICE..=MAX_SQRT_PRICE).contains(&sqrt_price)
}

pub fn is_tick_valid(tick: Tick) -> bool {
    (MIN_TICK..=MAX_TICK).contains(&tick)
}

pub fn sqrt_price_at_tick(tick: Tick) -> SqrtPriceQ64F96 {
    assert!(is_tick_valid(tick));

    let abs_tick = tick.unsigned_abs();

    let mut r = if abs_tick & 0x1u32 != 0 {
        U256::from(0xfffcb933bd6fad37aa2d162d1a594001u128)
    } else {
        U256::one() << 128u128
    };

    macro_rules! handle_tick_bit {
		($bit:literal, $constant:literal) => {
			/* Proof that `checked_mul` does not overflow:
				Note that the value ratio is initialized with above is such that `ratio <= (U256::one() << 128u128)`, alternatively `ratio <= (u128::MAX + 1)`
				First consider the case of applying the macro once assuming `ratio <= (U256::one() << 128u128)`:
					If ∀r ∈ U256, `r <= (U256::one() << 128u128)`, ∀C ∈ "Set of constants the macro is used with (Listed below)"
					Then `C * r <= U256::MAX` (See `debug_assertions` below)
					Therefore the `checked_mul` will not overflow
				Also note that above `(C * r >> 128u128) <= UINT128_MAX`
				Therefore if the if branch is taken ratio will be assigned a value `<= u128::MAX`
				else ratio is unchanged and remains `ratio <= u128::MAX + 1`
				Therefore as the assumption `ratio <= u128::MAX + 1` is always maintained after applying the macro,
				none of the checked_mul calls in any of the applications of the macro will overflow
			*/
			#[cfg(debug_assertions)]
			U256::checked_mul(U256::one() << 128u128, $constant.into()).unwrap();
			if abs_tick & (0x1u32 << $bit) != 0 {
				r = U256::checked_mul(r, U256::from($constant)).unwrap() >> 128u128
			}
		}
	}

    handle_tick_bit!(1, 0xfff97272373d413259a46990580e213au128);
    handle_tick_bit!(2, 0xfff2e50f5f656932ef12357cf3c7fdccu128);
    handle_tick_bit!(3, 0xffe5caca7e10e4e61c3624eaa0941cd0u128);
    handle_tick_bit!(4, 0xffcb9843d60f6159c9db58835c926644u128);
    handle_tick_bit!(5, 0xff973b41fa98c081472e6896dfb254c0u128);
    handle_tick_bit!(6, 0xff2ea16466c96a3843ec78b326b52861u128);
    handle_tick_bit!(7, 0xfe5dee046a99a2a811c461f1969c3053u128);
    handle_tick_bit!(8, 0xfcbe86c7900a88aedcffc83b479aa3a4u128);
    handle_tick_bit!(9, 0xf987a7253ac413176f2b074cf7815e54u128);
    handle_tick_bit!(10, 0xf3392b0822b70005940c7a398e4b70f3u128);
    handle_tick_bit!(11, 0xe7159475a2c29b7443b29c7fa6e889d9u128);
    handle_tick_bit!(12, 0xd097f3bdfd2022b8845ad8f792aa5825u128);
    handle_tick_bit!(13, 0xa9f746462d870fdf8a65dc1f90e061e5u128);
    handle_tick_bit!(14, 0x70d869a156d2a1b890bb3df62baf32f7u128);
    handle_tick_bit!(15, 0x31be135f97d08fd981231505542fcfa6u128);
    handle_tick_bit!(16, 0x9aa508b5b7a84e1c677de54f3e99bc9u128);
    handle_tick_bit!(17, 0x5d6af8dedb81196699c329225ee604u128);
    handle_tick_bit!(18, 0x2216e584f5fa1ea926041bedfe98u128);
    handle_tick_bit!(19, 0x48a170391f7dc42444e8fa2u128);
    // Note due to MIN_TICK and MAX_TICK bounds, past the 20th bit abs_tick is all zeros

    /* Proof that r is never zero (therefore avoiding the divide by zero case here):
        We can think of an application of the `handle_tick_bit` macro as increasing the index I of r's MSB/`r.ilog2()` (mul by constant), and then decreasing it by 128 (the right shift).

        Note the increase in I caused by the constant mul will be at least constant.ilog2().

        Also note each application of `handle_tick_bit` decreases (if the if branch is entered) or else maintains r's value as all the constants are less than 2^128.

        Therefore the largest decrease would be caused if all the macros application's if branches where entered.

        So we assuming all if branches are entered, after all the applications `I` would be at least I_initial + bigsum(constant.ilog2()) - 19*128.

        The test `r_non_zero` checks with value is >= 0, therefore imply the smallest value r could have is more than 0.
    */
    let sqrt_price_q32f128 = if tick > 0 { U256::MAX / r } else { r };

    // we round up in the division so tick_at_sqrt_price of the output price is always
    // consistent
    (sqrt_price_q32f128 >> 32u128)
        + if sqrt_price_q32f128.low_u32() == 0 {
            U256::zero()
        } else {
            U256::one()
        }
}

/// Calculates the greatest tick value such that `sqrt_price_at_tick(tick) <= sqrt_price`
pub fn tick_at_sqrt_price(sqrt_price: SqrtPriceQ64F96) -> Tick {
    assert!(is_sqrt_price_valid(sqrt_price));

    let sqrt_price_q64f128 = sqrt_price << 32u128;

    let (integer_log_2, mantissa) = {
        let mut _bits_remaining = sqrt_price_q64f128;
        let mut most_significant_bit = 0u8;

        // rustfmt chokes when formatting this macro.
        // See: https://github.com/rust-lang/rustfmt/issues/5404
        #[rustfmt::skip]
		macro_rules! add_integer_bit {
			($bit:literal, $lower_bits_mask:literal) => {
				if _bits_remaining > U256::from($lower_bits_mask) {
					most_significant_bit |= $bit;
					_bits_remaining >>= $bit;
				}
			};
		}

        add_integer_bit!(128u8, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFu128);
        add_integer_bit!(64u8, 0xFFFFFFFFFFFFFFFFu128);
        add_integer_bit!(32u8, 0xFFFFFFFFu128);
        add_integer_bit!(16u8, 0xFFFFu128);
        add_integer_bit!(8u8, 0xFFu128);
        add_integer_bit!(4u8, 0xFu128);
        add_integer_bit!(2u8, 0x3u128);
        add_integer_bit!(1u8, 0x1u128);

        (
            // most_significant_bit is the log2 of sqrt_price_q64f128 as an integer. This
            // converts most_significant_bit to the integer log2 of sqrt_price_q64f128 as an
            // q64f128
            ((most_significant_bit as i16) + (-128i16)) as i8,
            // Calculate mantissa of sqrt_price_q64f128.
            if most_significant_bit >= 128u8 {
                // The bits we possibly drop when right shifting don't contribute to the log2
                // above the 14th fractional bit.
                sqrt_price_q64f128 >> (most_significant_bit - 127u8)
            } else {
                sqrt_price_q64f128 << (127u8 - most_significant_bit)
            }
            .as_u128(), // Conversion to u128 is safe as top 128 bits are always zero
        )
    };

    let log_2_q63f64 = {
        let mut log_2_q63f64 = (integer_log_2 as i128) << 64u8;
        let mut _mantissa = mantissa;

        // rustfmt chokes when formatting this macro.
        // See: https://github.com/rust-lang/rustfmt/issues/5404
        #[rustfmt::skip]
		macro_rules! add_fractional_bit {
			($bit:literal) => {
				// Note squaring a number doubles its log
				let mantissa_sq =
					(U256::checked_mul(_mantissa.into(), _mantissa.into()).unwrap() >> 127u8);
				_mantissa = if mantissa_sq.bit(128) {
					// is the 129th bit set, all higher bits must be zero due to 127 right bit
					// shift
					log_2_q63f64 |= 1i128 << $bit;
					(mantissa_sq >> 1u8).as_u128()
				} else {
					mantissa_sq.as_u128()
				}
			};
		}

        add_fractional_bit!(63u8);
        add_fractional_bit!(62u8);
        add_fractional_bit!(61u8);
        add_fractional_bit!(60u8);
        add_fractional_bit!(59u8);
        add_fractional_bit!(58u8);
        add_fractional_bit!(57u8);
        add_fractional_bit!(56u8);
        add_fractional_bit!(55u8);
        add_fractional_bit!(54u8);
        add_fractional_bit!(53u8);
        add_fractional_bit!(52u8);
        add_fractional_bit!(51u8);
        add_fractional_bit!(50u8);

        // We don't need more precision than (63..50) = 14 bits

        log_2_q63f64
    };

    // Note we don't have a I256 type so I have to handle the negative mul case manually
    let log_sqrt10001_q127f128 = U256::overflowing_mul(
        if log_2_q63f64 < 0 {
            (U256::from(u128::MAX) << 128u8) | U256::from(log_2_q63f64 as u128)
        } else {
            U256::from(log_2_q63f64 as u128)
        },
        U256::from(255738958999603826347141u128),
    )
    .0;

    let tick_low = (U256::overflowing_sub(
        log_sqrt10001_q127f128,
        U256::from(3402992956809132418596140100660247210u128),
    )
    .0 >> 128u8)
        .as_u128() as Tick; // Add Checks
    let tick_high = (U256::overflowing_add(
        log_sqrt10001_q127f128,
        U256::from(291339464771989622907027621153398088495u128),
    )
    .0 >> 128u8)
        .as_u128() as Tick; // Add Checks

    if tick_low == tick_high {
        tick_low
    } else if sqrt_price_at_tick(tick_high) <= sqrt_price {
        tick_high
    } else {
        tick_low
    }
}
