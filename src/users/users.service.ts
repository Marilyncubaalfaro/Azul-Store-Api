import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  roles?: string[];
};

type UpdateAddressInput = {
  line1: string;
  city: string;
  country: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  findByEmail(email: string, includePassword = false) {
    const normalizedEmail = email.toLowerCase().trim();
    const query = this.userModel.findOne({ email: normalizedEmail });

    return includePassword ? query.select('+password') : query;
  }

  findById(userId: string) {
    return this.userModel.findById(userId);
  }

  createUser(input: CreateUserInput) {
    return this.userModel.create({
      ...input,
      email: input.email.toLowerCase().trim(),
    });
  }

  updateAddress(userId: string, address: UpdateAddressInput) {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        address: {
          line1: address.line1.trim(),
          city: address.city.trim(),
          country: address.country.trim(),
        },
      },
      { new: true },
    );
  }
}
