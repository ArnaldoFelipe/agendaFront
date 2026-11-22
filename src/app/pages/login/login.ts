import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  private auth = inject(AuthService);
  private router = inject(Router);

  erro = '';

  formLogin = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    senha: new FormControl('', [Validators.required])
  })

  async login(){
    if (this.formLogin.invalid){return}

    const{email, senha} = this.formLogin.getRawValue();
    try{
      await this.auth.entrar(email!, senha!);
      this.router.navigate(['/agenda']);
    }catch{
      this.erro = 'E-mail ou senha inválidos.'
    }
  }
}
