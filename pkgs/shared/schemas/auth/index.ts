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

export const referrerSchema = z.nullable(z.string());

export const authSchema = z.object({
	nickname: nicknameSchema,
	password: z.string().min(6),
});

export const registerSchema = z.object({
	...authSchema.shape,
	...z.object({
		findout: z.string().min(1).max(128),
		findoutType: z.enum(["custom", "referrer"]),
		hash: z.string(),
	}).superRefine((data, ctx) => {
		if (data.findoutType === "referrer") {
			const { error, success } = nicknameSchema.safeParse(data.findout);

			if (!success) {
				const msg = JSON.parse(error.message)[0];

				ctx.addIssue({
					path: ["findout"],
					code: "custom",
					message: msg.message,
				});
			}
		}
	}).shape,
});
