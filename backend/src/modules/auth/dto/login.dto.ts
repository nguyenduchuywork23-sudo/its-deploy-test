import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Matches(/^[a-zA-Z0-9._%+-]+@codegym\.vn$/i, {
    message: 'Email bắt buộc phải có đuôi tên miền @codegym.vn',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refreshToken!: string;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @Matches(/^[a-zA-Z0-9._%+-]+@codegym\.vn$/i, {
    message: 'Email bắt buộc phải có đuôi tên miền @codegym.vn',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName!: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
    {
      message:
        'Mật khẩu phải có tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt',
    },
  )
  password!: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò người dùng không hợp lệ' })
  role?: Role;
}
