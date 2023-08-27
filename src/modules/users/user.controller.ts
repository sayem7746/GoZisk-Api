import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "./user.model";
import userRepository from "./user.repository";
import IUserLogin from "./user.model";

export default class UserController {
  async create(req: Request, res: Response) {
    if (!req.body.full_name) {
      res.status(400).send({
        message: req.body //"Name can not be empty!"
      });
      return;
    }
    if (!req.body.username) {
      res.status(400).send({
        message: "User ID can not be empty!"
      });
      return;
    }
    if (!req.body.email) {
      res.status(400).send({
        message: "Email can not be empty!"
      });
      return;
    }
    if (!req.body.phone) {
      res.status(400).send({
        message: "Phone can not be empty!"
      });
      return;
    }
    if (!req.body.password) {
      res.status(400).send({
        message: "Password can not be empty!"
      });
      return;
    }

    try {
      const user: User = {...req.body, password_hash: req.body.password};

      const savedUser = await userRepository.save(user);

      res.status(201).send(savedUser);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving users."
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const userData: IUserLogin = req.body;

      const validUser: User = await userRepository.verifyLogin(userData);
      res.status(200).send(validUser);
    } catch (err) {
      res.status(500).send({
        message: "User not exists!."
      });
    }
  }

  async findAll(req: Request, res: Response) {
    const title = typeof req.query.title === "string" ? req.query.title : "";

    try {
      const users = await userRepository.retrieveAll({ title: title });

      res.status(200).send(users);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving users."
      });
    }
  }

  async findOne(req: Request, res: Response) {
    const id: number = parseInt(req.params.id);

    try {
      const user = await userRepository.retrieveById(id);

      if (user) res.status(200).send(user);
      else
        res.status(404).send({
          message: `Cannot find User with id=${id}.`
        });
    } catch (err) {
      res.status(500).send({
        message: `Error retrieving User with id=${id}.`
      });
    }
  }

  async update(req: Request, res: Response) {
    let user: User = req.body;
    user.id = parseInt(req.params.id);

    try {
      const num = await userRepository.update(user);

      if (num == 1) {
        res.send({
          message: "User was updated successfully."
        });
      } else {
        res.send({
          message: `Cannot update User with id=${user.id}. Maybe User was not found or req.body is empty!`
        });
      }
    } catch (err) {
      res.status(500).send({
        message: `Error updating User with id=${user.id}.`
      });
    }
  }

  async delete(req: Request, res: Response) {
    const id: number = parseInt(req.params.id);

    try {
      const num = await userRepository.delete(id);

      if (num == 1) {
        res.send({
          message: "User was deleted successfully!"
        });
      } else {
        res.send({
          message: `Cannot delete User with id=${id}. Maybe User was not found!`,
        });
      }
    } catch (err) {
      res.status(500).send({
        message: `Could not delete User with id==${id}.`
      });
    }
  }

  async deleteAll(req: Request, res: Response) {
    try {
      const num = await userRepository.deleteAll();

      res.send({ message: `${num} Users were deleted successfully!` });
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while removing all users."
      });
    }
  }

  async findAllPublished(req: Request, res: Response) {
    try {
      const users = await userRepository.retrieveAll({ published: true });

      res.status(200).send(users);
    } catch (err) {
      res.status(500).send({
        message: "Some error occurred while retrieving users."
      });
    }
  }
}
