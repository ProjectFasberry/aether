import { JSX } from "solid-js";

export const WrapperTitle = (props: { children: JSX.Element }) => {
  return (
    <div class="responsive px-1 flex bg-cover bg-no-repeat relative sm:px-0 mx-auto">
      {props.children}
    </div>
  );
};
