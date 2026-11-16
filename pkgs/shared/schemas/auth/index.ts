import * as z from "zod";

export const nicknameSchema = z
	.string()
	.min(1, { error: "Поле обязательно для заполнения!" })
	.max(16, { error: "Ник не содержит больше 16 символов!" })
	.regex(/^[^\u0400-\u04FF]*$/, { error: "Ник содержит недопустимые символы" })
	.regex(/^\S*$/, {
		error: "Ник не должен содержать пробельные символы (пробелы, табы и т.д.)",
	});

export const passwordSchema = z
	.string()
	.min(4, { error: "Пароль не должен содержать менее 4 символов" })
	.max(32, { error: "Пароль не должен превышать 32 символа" })
	.regex(/^\S*$/, {
		error: "Пароль не должен содержать пробельные символы (пробелы, табы и т.д.)",
	});

/**
 * Nicknames that the proxy accepts (`allowed-nickname-regex` in LimboAuth and
 * the vanilla client): 3-16 ASCII letters, digits and underscore. Registration
 * is strict; login keeps the lenient schema so old names never lock anybody out.
 */
export const registerNicknameSchema = z
	.string()
	.min(3, { error: "Ник должен содержать минимум 3 символа" })
	.max(16, { error: "Ник не содержит больше 16 символов!" })
	.regex(/^[A-Za-z0-9_]+$/, { error: "Ник может содержать только латиницу, цифры и _" });

export const authSchema = z.object({
	nickname: nicknameSchema,
	// Login stays permissive: legacy accounts may have shorter passwords than the
	// current registration policy allows.
	password: z.string().min(1).max(72),
});

export const registerSchema = z.object({
	...authSchema.shape,
	nickname: registerNicknameSchema,
	/** Optional "how did you hear about us?" answer; referrals use links only. */
	findout: z.string().min(1).max(128),
});
