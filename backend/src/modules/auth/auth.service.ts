import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_CONSTANTS } from './auth.constants';
import { LoginDto, RegisterDto } from './dto/login.dto';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: Role;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Đăng ký tài khoản người dùng mới với email @codegym.vn
   */
  async register(dto: RegisterDto): Promise<TokenResponse> {
    const cleanEmail = dto.email.toLowerCase().trim();

    // Kiểm tra định dạng đuôi email @codegym.vn
    if (!cleanEmail.endsWith('@codegym.vn')) {
      throw new BadRequestException(
        'Hệ thống chỉ chấp nhận tài khoản có định dạng email @codegym.vn',
      );
    }

    // Kiểm tra trùng lặp
    const existing = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      throw new BadRequestException('Email này đã được đăng ký tài khoản trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const userRole = dto.role ?? Role.INTERN;

    const user = await this.prisma.user.create({
      data: {
        email: cleanEmail,
        fullName: dto.fullName.trim(),
        password: hashedPassword,
        role: userRole,
      },
    });

    // Sinh cặp token sau khi đăng ký thành công
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Đăng nhập người dùng bằng email và mật khẩu
   */
  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Sinh cặp token
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Lưu hash refresh token vào DB
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Làm mới Access Token thông qua Refresh Token hợp lệ (xoay vòng token)
   */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: AUTH_CONSTANTS.REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị vô hiệu hóa, vui lòng đăng nhập lại');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token đã bị thay đổi hoặc không khớp');
    }

    // Sinh cặp token mới
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Cập nhật lại hash refresh token mới
    const hashedNewRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedNewRefreshToken },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /**
   * Đăng xuất và xóa refresh token trong cơ sở dữ liệu
   */
  async logout(userId: string): Promise<{ ok: boolean; message: string }> {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { ok: true, message: 'Đăng xuất thành công' };
  }

  /**
   * Lấy thông tin người dùng hiện tại
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        assignedGroups: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản');
    }

    return user;
  }

  /**
   * Khởi tạo sẵn 4 tài khoản mẫu cho 4 vai trò
   */
  async seedDemoUsers() {
    const defaultPassword = 'Password@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const accounts = [
      {
        email: 'sysadmin@cg.edu.vn',
        fullName: 'Quản Trị Viên Hệ Thống (SysAdmin)',
        role: Role.SYSADMIN,
        password: hashedPassword,
      },
      {
        email: 'leadmentor@cg.edu.vn',
        fullName: 'Nguyễn Văn Mentor Trưởng',
        role: Role.LEAD_MENTOR,
        password: hashedPassword,
      },
      {
        email: 'mentor@cg.edu.vn',
        fullName: 'Trần Thị Mentor Phụ Trách',
        role: Role.MENTOR,
        password: hashedPassword,
      },
      {
        email: 'intern@cg.edu.vn',
        fullName: 'Lê Văn Thực Tập Sinh',
        role: Role.INTERN,
        password: hashedPassword,
      },
    ];

    const results = [];
    for (const acc of accounts) {
      const existing = await this.prisma.user.findUnique({
        where: { email: acc.email },
      });

      if (!existing) {
        const created = await this.prisma.user.create({
          data: acc,
        });
        results.push({ email: created.email, role: created.role, created: true });
      } else {
        // Cập nhật role nếu đã tồn tại
        const updated = await this.prisma.user.update({
          where: { email: acc.email },
          data: { role: acc.role, fullName: acc.fullName },
        });
        results.push({ email: updated.email, role: updated.role, updated: true });
      }
    }

    // Gán mentor@cg.edu.vn vào nhóm GRP001 đầu tiên nếu có
    const targetGroup = await this.prisma.group.findFirst({
      where: { code: 'GRP001' },
    });
    const mentorUser = await this.prisma.user.findUnique({
      where: { email: 'mentor@cg.edu.vn' },
    });
    const internUser = await this.prisma.user.findUnique({
      where: { email: 'intern@cg.edu.vn' },
    });

    if (targetGroup && mentorUser) {
      await this.prisma.group.update({
        where: { id: targetGroup.id },
        data: { mentorId: mentorUser.id },
      });

      if (internUser) {
        const member = await this.prisma.groupMember.findFirst({
          where: { groupId: targetGroup.id },
        });
        if (member) {
          await this.prisma.groupMember.update({
            where: { id: member.id },
            data: { userId: internUser.id },
          });
        }
      }
    }

    return {
      message: 'Khởi tạo 4 tài khoản thành công',
      defaultPassword,
      accounts: results,
    };
  }

  /**
   * Helper sinh Access Token và Refresh Token
   */
  private async generateTokens(userId: string, email: string, role: Role) {
    const accessPayload = { sub: userId, email, role };
    const refreshPayload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: AUTH_CONSTANTS.ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: AUTH_CONSTANTS.REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
